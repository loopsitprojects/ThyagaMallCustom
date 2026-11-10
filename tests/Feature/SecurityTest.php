<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\ThyagaVoucherController;
use App\Models\Admin;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    private function customerToken(): string
    {
        $user = User::create([
            'name' => 'Cust', 'email' => 'cust@example.com', 'password' => Hash::make('secret-pass'),
            'role' => 'customer', 'status' => 'active',
        ]);

        return $user->createToken('customer-token', ['customer'])->plainTextToken;
    }

    private function admin(string $role = 'super_admin', string $status = 'active'): Admin
    {
        return Admin::create([
            'name' => 'Admin', 'email' => "{$role}-{$status}@thyaga.lk", 'password' => Hash::make('admin-pass-123'),
            'role' => $role, 'status' => $status,
        ]);
    }

    private function product(array $overrides = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Test Item', 'slug' => 'test-item-'.uniqid(), 'regular_price' => 5000,
            'stock_quantity' => 5, 'is_active' => true,
        ], $overrides));
    }

    private function orderPayload(Product $product, array $overrides = []): array
    {
        return array_merge([
            'customer_name' => 'Jane Doe', 'customer_email' => 'jane@example.com', 'customer_phone' => '0771234567',
            'shipping_address' => '1 Main St', 'shipping_city' => 'Colombo',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => 'cod',
        ], $overrides);
    }

    public function test_customer_token_cannot_access_admin_routes(): void
    {
        $token = $this->customerToken();

        foreach (['/api/admin/stats', '/api/admin/orders', '/api/admin/admins'] as $url) {
            $this->withToken($token)->getJson($url)->assertForbidden();
        }

        $this->withToken($token)->postJson('/api/admin/admins', [
            'name' => 'Evil', 'email' => 'evil@example.com', 'role' => 'super_admin', 'password' => 'whatever-123',
        ])->assertForbidden();
        $this->assertDatabaseMissing('admins', ['email' => 'evil@example.com']);
    }

    public function test_admin_token_works_but_only_super_admins_manage_staff(): void
    {
        $editorToken = $this->admin('editor')->createToken('admin-token', ['admin'])->plainTextToken;

        $this->withToken($editorToken)->getJson('/api/admin/stats')->assertOk();
        $this->withToken($editorToken)->getJson('/api/admin/admins')->assertForbidden();

        $this->app['auth']->forgetGuards(); // switch identity within the test

        $superToken = $this->admin('super_admin')->createToken('admin-token', ['admin'])->plainTextToken;
        $this->withToken($superToken)->getJson('/api/admin/admins')->assertOk();
    }

    public function test_admin_token_cannot_use_customer_routes(): void
    {
        $token = $this->admin()->createToken('admin-token', ['admin'])->plainTextToken;

        $this->withToken($token)->getJson('/api/user/me')->assertForbidden();
    }

    public function test_suspended_admin_cannot_log_in_or_use_existing_token(): void
    {
        $admin = $this->admin('manager', 'suspended');

        $this->postJson('/api/admin/login', ['email' => $admin->email, 'password' => 'admin-pass-123'])
            ->assertUnprocessable();

        $token = $admin->createToken('admin-token', ['admin'])->plainTextToken;
        $this->withToken($token)->getJson('/api/admin/stats')->assertForbidden();
    }

    public function test_unsigned_webxpay_callback_does_not_mark_order_paid(): void
    {
        $order = $this->postJson('/api/orders', $this->orderPayload($this->product(), ['payment_method' => 'webxpay']))
            ->assertCreated()->json('data.order_number');

        // Plain forged fields
        $this->post('/api/payment/webxpay/callback', ['order_id' => $order, 'status_code' => '0']);
        // Forged payment blob without a signature
        $this->post('/api/payment/webxpay/callback', ['payment' => base64_encode("{$order}|00|TX1")]);

        $this->assertSame('pending', Order::where('order_number', $order)->value('payment_status'));
    }

    public function test_correctly_signed_webxpay_callback_marks_order_paid(): void
    {
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        $publicKey = openssl_pkey_get_details($key)['key'];
        config(['webxpay.public_key' => $publicKey]);

        $order = $this->postJson('/api/orders', $this->orderPayload($this->product(), ['payment_method' => 'webxpay']))
            ->assertCreated()->json('data.order_number');

        $payment = "{$order}|00|TX123";
        openssl_private_encrypt($payment, $signature, $key);

        $this->post('/api/payment/webxpay/callback', [
            'payment' => base64_encode($payment),
            'signature' => base64_encode($signature),
        ])->assertRedirect();

        $this->assertSame('paid', Order::where('order_number', $order)->value('payment_status'));
    }

    public function test_voucher_discount_cannot_be_set_by_the_client(): void
    {
        $product = $this->product();

        // No server-side hold recorded → rejected, and stock is rolled back.
        $this->postJson('/api/orders', $this->orderPayload($product, [
            'payment_method' => 'voucher', 'voucher_redemption_id' => 'fake-123', 'voucher_amount' => 999999,
        ]))->assertUnprocessable();
        $this->assertSame(5, $product->fresh()->stock_quantity);
        $this->assertSame(0, Order::count());
    }

    public function test_voucher_discount_uses_the_server_verified_hold_amount_once(): void
    {
        config(['thyaga.api_key' => 'test-key', 'thyaga.mode' => 'live', 'thyaga.endpoints.live' => 'https://thyaga.test/api']);
        Http::fake(['thyaga.test/*' => Http::response(['status' => 'OK'])]);
        Cache::put(ThyagaVoucherController::holdCacheKey('red-1'), 1000.0, now()->addMinutes(5));

        $payload = $this->orderPayload($this->product(), [
            'payment_method' => 'voucher_cod', 'voucher_redemption_id' => 'red-1', 'voucher_amount' => 999999,
        ]);

        $this->postJson('/api/orders', $payload)->assertCreated()->assertJsonPath('data.discount', '1000.00');
        // Hold is single-use.
        $this->postJson('/api/orders', $payload)->assertUnprocessable();
    }

    public function test_inactive_or_out_of_stock_products_cannot_be_ordered(): void
    {
        $this->postJson('/api/orders', $this->orderPayload($this->product(['is_active' => false])))
            ->assertUnprocessable();

        $product = $this->product(['stock_quantity' => 1]);
        $this->postJson('/api/orders', $this->orderPayload($product, [
            'items' => [['product_id' => $product->id, 'quantity' => 3]],
        ]))->assertUnprocessable();
        $this->assertSame(1, $product->fresh()->stock_quantity);
    }

    public function test_guest_orders_are_not_linked_to_accounts_by_email(): void
    {
        $token = $this->customerToken();

        $this->postJson('/api/orders', $this->orderPayload($this->product(), ['customer_email' => 'cust@example.com']))
            ->assertCreated();

        $this->withToken($token)->getJson('/api/user/orders')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_errors_do_not_leak_internals(): void
    {
        config(['app.debug' => false]); // as in production

        $response = $this->getJson('/api/products/does-not-exist')->assertNotFound();

        $this->assertArrayNotHasKey('file', $response->json());
        $this->assertArrayNotHasKey('trace', $response->json());
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/admin/login', ['email' => 'x@thyaga.lk', 'password' => 'wrong']);
        }

        $this->postJson('/api/admin/login', ['email' => 'x@thyaga.lk', 'password' => 'wrong'])
            ->assertStatus(429);
    }
}
