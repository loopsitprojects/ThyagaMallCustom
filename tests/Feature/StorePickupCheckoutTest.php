<?php

namespace Tests\Feature;

use App\Mail\OrderConfirmation;
use App\Models\Admin;
use App\Models\Product;
use App\Models\User;
use App\Services\StorePickupSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StorePickupCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function product(float $price = 1500): Product
    {
        return Product::create([
            'name' => 'Ceramic Mug', 'slug' => 'ceramic-mug', 'sku' => 'MUG-001',
            'regular_price' => $price, 'stock_quantity' => 10, 'is_active' => true,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function contactDetails(Product $product): array
    {
        return [
            'customer_name' => 'Nimali Silva', 'customer_email' => 'nimali@example.com', 'customer_phone' => '0771234567',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => 'cod',
        ];
    }

    private function adminToken(): string
    {
        return Admin::create([
            'name' => 'Editor', 'email' => 'editor@thyaga.lk', 'password' => Hash::make('admin-pass-123'),
            'role' => 'editor', 'status' => 'active',
        ])->createToken('admin-token', ['admin'])->plainTextToken;
    }

    /**
     * @return array<string, mixed>
     */
    private function kandyStore(): array
    {
        return [
            'enabled' => true, 'name' => 'Thyaga Kandy', 'address' => '12 Peradeniya Road', 'city' => 'Kandy',
            'phone' => '081 222 3333', 'opening_hours' => 'Daily, 9 AM – 7 PM', 'instructions' => 'Bring your order number.',
        ];
    }

    public function test_admin_changes_to_the_pickup_store_are_saved_and_shown_at_checkout(): void
    {
        $this->withToken($this->adminToken())->putJson('/api/admin/store-pickup', $this->kandyStore())
            ->assertOk()
            ->assertJsonPath('data.city', 'Kandy');

        $this->getJson('/api/store-pickup')
            ->assertOk()
            ->assertJsonPath('data.name', 'Thyaga Kandy')
            ->assertJsonPath('data.address', '12 Peradeniya Road')
            ->assertJsonPath('data.opening_hours', 'Daily, 9 AM – 7 PM');
    }

    public function test_pickup_order_needs_no_address_is_free_and_saves_the_admin_store_location(): void
    {
        Mail::fake();
        app(StorePickupSettings::class)->update($this->kandyStore());

        $this->postJson('/api/orders', [...$this->contactDetails($this->product()), 'delivery_method' => 'pickup'])
            ->assertCreated()
            ->assertJsonPath('data.delivery_method', 'pickup')
            ->assertJsonPath('data.total', '1500.00');

        $this->assertDatabaseHas('orders', [
            'delivery_method' => 'pickup',
            'shipping_fee' => 0,
            'shipping_address' => 'Thyaga Kandy, 12 Peradeniya Road',
            'shipping_city' => 'Kandy',
        ]);
        Mail::assertSent(OrderConfirmation::class, fn (OrderConfirmation $mail) => str_contains($mail->render(), 'Store pickup'));
    }

    public function test_pickup_ignores_any_address_the_browser_sends(): void
    {
        Mail::fake();

        $this->postJson('/api/orders', [
            ...$this->contactDetails($this->product()),
            'delivery_method' => 'pickup',
            'shipping_address' => '12 Galle Road',
            'shipping_city' => 'Galle',
        ])->assertCreated();

        $this->assertDatabaseMissing('orders', ['shipping_city' => 'Galle']);
    }

    public function test_switched_off_pickup_is_hidden_and_refused_at_checkout(): void
    {
        $this->withToken($this->adminToken())->putJson('/api/admin/store-pickup', [...$this->kandyStore(), 'enabled' => false])
            ->assertOk();

        $this->getJson('/api/store-pickup')->assertOk()->assertJsonPath('data', null);

        $this->postJson('/api/orders', [...$this->contactDetails($this->product()), 'delivery_method' => 'pickup'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['delivery_method']);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_home_delivery_still_requires_an_address_and_charges_shipping(): void
    {
        Mail::fake();
        $product = $this->product();

        $this->postJson('/api/orders', [...$this->contactDetails($product), 'delivery_method' => 'delivery'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['shipping_address', 'shipping_city']);

        $this->postJson('/api/orders', [
            ...$this->contactDetails($product),
            'shipping_address' => '12 Galle Road', 'shipping_city' => 'Galle',
        ])->assertCreated()->assertJsonPath('data.delivery_method', 'delivery');

        $this->assertDatabaseHas('orders', ['delivery_method' => 'delivery', 'shipping_fee' => 350, 'shipping_city' => 'Galle']);
    }

    public function test_unknown_delivery_method_is_rejected(): void
    {
        $this->postJson('/api/orders', [...$this->contactDetails($this->product()), 'delivery_method' => 'drone'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['delivery_method']);
    }

    public function test_pickup_store_requires_a_name_address_and_city(): void
    {
        $this->withToken($this->adminToken())
            ->putJson('/api/admin/store-pickup', ['enabled' => true, 'name' => '', 'address' => '', 'city' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'address', 'city']);
    }

    public function test_customers_and_guests_cannot_change_the_pickup_store(): void
    {
        $this->putJson('/api/admin/store-pickup', $this->kandyStore())->assertUnauthorized();

        $customer = User::create([
            'name' => 'Shopper', 'email' => 'shopper@example.com', 'password' => Hash::make('secret-pass-123'),
            'role' => 'customer', 'status' => 'active',
        ])->createToken('customer-token', ['customer'])->plainTextToken;

        $this->withToken($customer)->putJson('/api/admin/store-pickup', $this->kandyStore())->assertForbidden();
        $this->getJson('/api/store-pickup')->assertJsonPath('data.city', 'Colombo 05');
    }
}
