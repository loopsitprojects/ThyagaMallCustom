<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Category;
use App\Models\Merchant;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OrderWaybillTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        return Admin::create([
            'name' => 'Admin User',
            'email' => 'admin@thyaga.lk',
            'password' => Hash::make('admin-pass-123'),
            'role' => 'super_admin',
            'status' => 'active',
        ])->createToken('admin-token', ['admin'])->plainTextToken;
    }

    private function createOrderWithMerchants(): array
    {
        $category = Category::create([
            'name' => 'Home & Living',
            'slug' => 'home-living',
            'is_active' => true,
        ]);

        $merchantA = Merchant::create([
            'name' => 'Living Styles',
            'slug' => 'living-styles',
            'code' => '0015LS',
            'phone' => '0710982629',
            'status' => 'active',
        ]);

        $merchantB = Merchant::create([
            'name' => 'Damro',
            'slug' => 'damro',
            'code' => '0020DM',
            'phone' => '0112334455',
            'status' => 'active',
        ]);

        $productA = Product::create([
            'category_id' => $category->id,
            'merchant_id' => $merchantA->id,
            'name' => 'Wireless SOS alarm',
            'slug' => 'wireless-sos-alarm',
            'sku' => '0015LS/006',
            'regular_price' => 6500,
            'stock_quantity' => 10,
            'is_active' => true,
        ]);

        $productB = Product::create([
            'category_id' => $category->id,
            'merchant_id' => $merchantB->id,
            'name' => 'Office Chair Ergonomic',
            'slug' => 'office-chair-ergonomic',
            'sku' => '0020DM/001',
            'regular_price' => 18000,
            'stock_quantity' => 5,
            'is_active' => true,
        ]);

        $order = Order::create([
            'order_number' => 'ORD-116',
            'customer_name' => 'Kasun Perera',
            'customer_email' => 'kasun@example.com',
            'customer_phone' => '0771234567',
            'shipping_address' => '334 T B Jayah Mawatha',
            'shipping_city' => 'Colombo',
            'subtotal' => 24500,
            'shipping_fee' => 0,
            'total' => 24500,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'processing',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $productA->id,
            'product_name' => $productA->name,
            'unit_price' => 6500,
            'quantity' => 1,
            'total_price' => 6500,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $productB->id,
            'product_name' => $productB->name,
            'unit_price' => 18000,
            'quantity' => 1,
            'total_price' => 18000,
        ]);

        return [$order, $merchantA, $merchantB];
    }

    public function test_guests_cannot_access_order_waybills_api(): void
    {
        $this->getJson('/api/admin/orders/1/waybills')->assertUnauthorized();
    }

    public function test_customers_cannot_access_order_waybills_api(): void
    {
        $token = User::create([
            'name' => 'Customer',
            'email' => 'customer@example.com',
            'password' => Hash::make('secret-123'),
            'role' => 'customer',
            'status' => 'active',
        ])->createToken('customer-token', ['customer'])->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/orders/1/waybills')->assertForbidden();
    }

    public function test_admin_receives_separate_waybills_for_each_merchant(): void
    {
        $token = $this->adminToken();
        [$order, $merchantA, $merchantB] = $this->createOrderWithMerchants();

        $response = $this->withToken($token)->getJson("/api/admin/orders/{$order->id}/waybills");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.order.order_number', 'ORD-116')
            ->assertJsonCount(2, 'data.waybills');

        $waybills = $response->json('data.waybills');

        // Check Merchant A (Living Styles) waybill
        $wbA = collect($waybills)->firstWhere('merchant.code', '0015LS');
        $this->assertNotNull($wbA);
        $this->assertEquals('Living Styles', $wbA['merchant']['name']);
        $this->assertEquals(6500.0, $wbA['subtotal']);
        $this->assertEquals(6500.0, $wbA['grand_total']);
        $this->assertCount(1, $wbA['items']);
        $this->assertEquals('Wireless SOS alarm', $wbA['items'][0]['product_name']);
        $this->assertEquals('0015LS/006', $wbA['items'][0]['sku']);

        // Check Merchant B (Damro) waybill
        $wbB = collect($waybills)->firstWhere('merchant.code', '0020DM');
        $this->assertNotNull($wbB);
        $this->assertEquals('Damro', $wbB['merchant']['name']);
        $this->assertEquals(18000.0, $wbB['subtotal']);
        $this->assertEquals(18000.0, $wbB['grand_total']);
        $this->assertCount(1, $wbB['items']);
        $this->assertEquals('Office Chair Ergonomic', $wbB['items'][0]['product_name']);
    }

    public function test_printable_html_waybill_endpoint_renders_properly(): void
    {
        [$order, $merchantA] = $this->createOrderWithMerchants();

        $response = $this->get("/admin/orders/{$order->id}/waybill/{$merchantA->id}");

        $response->assertOk()
            ->assertSee('O R D E R &nbsp; F O R M', false)
            ->assertSee('Living Styles')
            ->assertSee('0015LS')
            ->assertSee('ORD-116')
            ->assertSee('Wireless SOS alarm')
            ->assertSee('No.2 Sulaiman Terrace, Colombo 5')
            ->assertSee('JOY- 0710982629');
    }
}
