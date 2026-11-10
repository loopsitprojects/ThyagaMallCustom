<?php

namespace Tests\Feature;

use App\Jobs\SendRestockEmails;
use App\Mail\ProductRestocked;
use App\Models\Admin;
use App\Models\Product;
use App\Models\RestockRequest;
use App\Models\User;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RestockRequestTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        return Admin::create([
            'name' => 'Editor', 'email' => 'editor@thyaga.lk', 'password' => Hash::make('admin-pass-123'),
            'role' => 'editor', 'status' => 'active',
        ])->createToken('admin-token', ['admin'])->plainTextToken;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function product(array $attributes = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Gift Hamper', 'slug' => 'gift-hamper', 'sku' => 'HAMPER-1',
            'regular_price' => 5000, 'stock_quantity' => 0, 'is_active' => true,
        ], $attributes));
    }

    private function subscribe(Product $product, string $email): RestockRequest
    {
        return RestockRequest::create(['product_id' => $product->id, 'email' => $email]);
    }

    public function test_shopper_can_ask_to_be_told_about_an_out_of_stock_product(): void
    {
        $product = $this->product();

        $this->postJson('/api/products/gift-hamper/restock-alerts', ['email' => ' Shopper@Example.com '])->assertCreated();

        $this->assertDatabaseHas('restock_requests', [
            'product_id' => $product->id, 'email' => 'shopper@example.com', 'notified_at' => null,
        ]);
    }

    public function test_asking_twice_keeps_one_request_and_rearms_a_sent_alert(): void
    {
        $request = $this->subscribe($this->product(), 'shopper@example.com');
        $request->update(['notified_at' => now()]);

        $this->postJson('/api/products/gift-hamper/restock-alerts', ['email' => 'shopper@example.com'])->assertCreated();

        $this->assertDatabaseCount('restock_requests', 1);
        $this->assertNull($request->fresh()->notified_at);
    }

    public function test_alert_is_refused_for_products_in_stock_hidden_or_missing(): void
    {
        $this->product(['stock_quantity' => 3]);
        $this->product(['slug' => 'hidden', 'is_active' => false]);

        $this->postJson('/api/products/gift-hamper/restock-alerts', ['email' => 'a@example.com'])->assertUnprocessable();
        $this->postJson('/api/products/hidden/restock-alerts', ['email' => 'a@example.com'])->assertNotFound();
        $this->postJson('/api/products/missing/restock-alerts', ['email' => 'a@example.com'])->assertNotFound();
        $this->assertDatabaseCount('restock_requests', 0);
    }

    public function test_email_must_be_valid(): void
    {
        $this->product();

        $this->postJson('/api/products/gift-hamper/restock-alerts', ['email' => 'not-an-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_restocking_emails_only_waiting_shoppers_of_that_product(): void
    {
        Mail::fake();
        $product = $this->product();
        $waiting = $this->subscribe($product, 'waiting@example.com');
        $this->subscribe($product, 'done@example.com')->update(['notified_at' => now()->subDay()]);
        $this->subscribe($this->product(['slug' => 'other']), 'other@example.com');

        $this->withToken($this->adminToken())->putJson("/api/admin/products/{$product->id}", ['stock_quantity' => 10])->assertOk();

        Mail::assertSent(ProductRestocked::class, 1);
        Mail::assertSent(ProductRestocked::class, fn ($mail) => $mail->hasTo('waiting@example.com') && $mail->product->is($product));
        $this->assertNotNull($waiting->fresh()->notified_at);
    }

    public function test_no_email_unless_the_product_becomes_available(): void
    {
        Mail::fake();
        $token = $this->adminToken();
        $outOfStock = $this->product();
        $this->subscribe($outOfStock, 'a@example.com');
        $this->withToken($token)->putJson("/api/admin/products/{$outOfStock->id}", ['regular_price' => 4000])->assertOk();

        $hidden = $this->product(['slug' => 'hidden', 'is_active' => false]);
        $this->subscribe($hidden, 'b@example.com');
        $this->withToken($token)->putJson("/api/admin/products/{$hidden->id}", ['stock_quantity' => 5])->assertOk();

        $topUp = $this->product(['slug' => 'top-up', 'stock_quantity' => 2]);
        $this->subscribe($topUp, 'c@example.com');
        $this->withToken($token)->putJson("/api/admin/products/{$topUp->id}", ['stock_quantity' => 20])->assertOk();

        Mail::assertNothingSent();
    }

    public function test_unhiding_a_restocked_product_emails_waiting_shoppers(): void
    {
        Mail::fake();
        $product = $this->product(['stock_quantity' => 5, 'is_active' => false]);
        $this->subscribe($product, 'waiting@example.com');

        $this->withToken($this->adminToken())->putJson("/api/admin/products/{$product->id}", ['is_active' => true])->assertOk();

        Mail::assertSent(ProductRestocked::class, 1);
    }

    public function test_failed_email_stays_waiting_and_does_not_stop_the_rest(): void
    {
        $product = $this->product(['stock_quantity' => 5]);
        $failing = $this->subscribe($product, 'failing@example.com');
        $working = $this->subscribe($product, 'working@example.com');

        Mail::shouldReceive('to')->with('failing@example.com')->andThrow(new Exception('SMTP down'));
        Mail::shouldReceive('to')->with('working@example.com')->andReturnSelf();
        Mail::shouldReceive('send')->once();

        (new SendRestockEmails($product))->handle();

        $this->assertNull($failing->fresh()->notified_at);
        $this->assertNotNull($working->fresh()->notified_at);
    }

    public function test_email_links_to_the_product(): void
    {
        config(['app.frontend_url' => 'https://mall.test/ThyagaMall']);
        $mail = new ProductRestocked($this->product(['stock_quantity' => 5, 'sale_price' => 4500]));

        $mail->assertHasSubject('Back in stock: Gift Hamper');
        $mail->assertSeeInHtml('https://mall.test/ThyagaMall/product/gift-hamper/', false);
        $mail->assertSeeInHtml('Rs.4,500.00');
    }

    public function test_admin_sees_emails_grouped_by_product_and_can_filter_them(): void
    {
        $token = $this->adminToken();
        $hamper = $this->product();
        $tea = $this->product(['name' => 'Ceylon Tea', 'slug' => 'tea', 'sku' => 'TEA-1']);
        $this->product(['name' => 'Nobody Waiting', 'slug' => 'nobody']);
        $this->subscribe($hamper, 'first@example.com');
        $this->subscribe($hamper, 'second@example.com')->update(['notified_at' => now()]);
        $this->subscribe($tea, 'tea@example.com');

        $this->withToken($token)->getJson('/api/admin/restock-requests')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('stats.waiting', 2)
            ->assertJsonPath('stats.notified', 1);

        $this->withToken($token)->getJson('/api/admin/restock-requests?status=notified')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $hamper->id)
            ->assertJsonCount(1, 'data.0.restock_requests')
            ->assertJsonPath('data.0.restock_requests.0.email', 'second@example.com');

        $this->withToken($token)->getJson('/api/admin/restock-requests?search=tea@example')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $tea->id);

        $this->withToken($token)->getJson('/api/admin/restock-requests?search=Hamper')
            ->assertJsonCount(1, 'data')
            ->assertJsonCount(2, 'data.0.restock_requests');
    }

    public function test_admin_can_remove_an_email(): void
    {
        $request = $this->subscribe($this->product(), 'gone@example.com');

        $this->withToken($this->adminToken())->deleteJson("/api/admin/restock-requests/{$request->id}")->assertOk();

        $this->assertDatabaseCount('restock_requests', 0);
    }

    public function test_customers_and_guests_cannot_read_the_emails(): void
    {
        $this->getJson('/api/admin/restock-requests')->assertUnauthorized();

        $customer = User::create([
            'name' => 'C', 'email' => 'c@example.com', 'password' => Hash::make('x-pass-123'),
            'role' => 'customer', 'status' => 'active',
        ])->createToken('customer-token', ['customer'])->plainTextToken;

        $this->withToken($customer)->getJson('/api/admin/restock-requests')->assertForbidden();
    }
}
