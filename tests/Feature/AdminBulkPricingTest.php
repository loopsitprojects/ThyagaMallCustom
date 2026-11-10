<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminBulkPricingTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        return Admin::create([
            'name' => 'Store Admin',
            'email' => 'admin@thyaga.lk',
            'password' => Hash::make('secret123'),
            'role' => 'editor',
            'status' => 'active',
        ])->createToken('admin-token', ['admin'])->plainTextToken;
    }

    public function test_guest_cannot_bulk_adjust_pricing(): void
    {
        $this->postJson('/api/admin/products/bulk-pricing', [
            'product_ids' => [1],
            'target' => 'discount',
        ])->assertUnauthorized();
    }

    public function test_admin_can_increase_regular_price_by_percentage(): void
    {
        $token = $this->adminToken();
        $cat = Category::create(['name' => 'Fashion', 'slug' => 'fashion']);

        $p1 = Product::create([
            'name' => 'Product A',
            'slug' => 'product-a',
            'category_id' => $cat->id,
            'regular_price' => 1000,
            'sale_price' => null,
            'stock_quantity' => 20,
            'is_active' => true,
        ]);

        $p2 = Product::create([
            'name' => 'Product B',
            'slug' => 'product-b',
            'category_id' => $cat->id,
            'regular_price' => 2000,
            'sale_price' => 1800,
            'stock_quantity' => 15,
            'is_active' => true,
        ]);

        // Increase regular price by 10%
        $res = $this->withToken($token)->postJson('/api/admin/products/bulk-pricing', [
            'product_ids' => [$p1->id, $p2->id],
            'target' => 'regular_price',
            'regular_action' => 'increase_percent',
            'regular_value' => 10,
            'sale_price_handling' => 'keep_discount_percent',
        ])->assertOk();

        $res->assertJsonPath('success', true);
        $res->assertJsonPath('updated_count', 2);

        $this->assertEquals(1100, (float) $p1->fresh()->regular_price);
        $this->assertNull($p1->fresh()->sale_price);

        // Product B was 2000 reg, 1800 sale (10% discount).
        // New reg: 2200, kept 10% discount -> new sale: 1980
        $this->assertEquals(2200, (float) $p2->fresh()->regular_price);
        $this->assertEquals(1980, (float) $p2->fresh()->sale_price);
    }

    public function test_admin_can_add_percentage_discount(): void
    {
        $token = $this->adminToken();
        $cat = Category::create(['name' => 'Kitchen', 'slug' => 'kitchen']);

        $p1 = Product::create([
            'name' => 'Product Kitchen',
            'slug' => 'product-kitchen',
            'category_id' => $cat->id,
            'regular_price' => 5000,
            'sale_price' => null,
            'stock_quantity' => 30,
            'is_active' => true,
        ]);

        // Apply 20% discount
        $res = $this->withToken($token)->postJson('/api/admin/products/bulk-pricing', [
            'product_ids' => [$p1->id],
            'target' => 'discount',
            'discount_action' => 'set_percent',
            'discount_value' => 20,
        ])->assertOk();

        $res->assertJsonPath('success', true);
        $this->assertEquals(5000, (float) $p1->fresh()->regular_price);
        $this->assertEquals(4000, (float) $p1->fresh()->sale_price);
        $this->assertEquals(20, $p1->fresh()->discount_percentage);
    }

    public function test_admin_can_add_flat_discount_and_clear_discount(): void
    {
        $token = $this->adminToken();
        $cat = Category::create(['name' => 'Decor', 'slug' => 'decor']);

        $p1 = Product::create([
            'name' => 'Vase',
            'slug' => 'vase',
            'category_id' => $cat->id,
            'regular_price' => 3500,
            'sale_price' => null,
            'stock_quantity' => 10,
            'is_active' => true,
        ]);

        // Flat Rs. 500 discount
        $this->withToken($token)->postJson('/api/admin/products/bulk-pricing', [
            'product_ids' => [$p1->id],
            'target' => 'discount',
            'discount_action' => 'set_flat_discount',
            'discount_value' => 500,
        ])->assertOk();

        $this->assertEquals(3000, (float) $p1->fresh()->sale_price);

        // Clear discount
        $this->withToken($token)->postJson('/api/admin/products/bulk-pricing', [
            'product_ids' => [$p1->id],
            'target' => 'discount',
            'discount_action' => 'clear_discount',
        ])->assertOk();

        $this->assertNull($p1->fresh()->sale_price);
    }

    public function test_admin_can_increase_regular_price_by_flat_amount_with_rounding(): void
    {
        $token = $this->adminToken();
        $cat = Category::create(['name' => 'Sports', 'slug' => 'sports']);

        $p1 = Product::create([
            'name' => 'Football',
            'slug' => 'football',
            'category_id' => $cat->id,
            'regular_price' => 2435,
            'sale_price' => null,
            'stock_quantity' => 5,
            'is_active' => true,
        ]);

        // Add Rs. 150 flat and round to nearest 50
        // 2435 + 150 = 2585 -> rounded to nearest 50 is 2600
        $this->withToken($token)->postJson('/api/admin/products/bulk-pricing', [
            'product_ids' => [$p1->id],
            'target' => 'regular_price',
            'regular_action' => 'increase_flat',
            'regular_value' => 150,
            'round_to' => '50',
        ])->assertOk();

        $this->assertEquals(2600, (float) $p1->fresh()->regular_price);
    }

    public function test_admin_can_adjust_both_regular_price_and_discount(): void
    {
        $token = $this->adminToken();
        $cat = Category::create(['name' => 'Electronics', 'slug' => 'electronics']);

        $p1 = Product::create([
            'name' => 'Headphones',
            'slug' => 'headphones',
            'category_id' => $cat->id,
            'regular_price' => 10000,
            'sale_price' => null,
            'stock_quantity' => 10,
            'is_active' => true,
        ]);

        // Increase regular price by 20% (to 12,000) and set 25% discount (sale price = 9,000)
        $this->withToken($token)->postJson('/api/admin/products/bulk-pricing', [
            'product_ids' => [$p1->id],
            'target' => 'both',
            'regular_action' => 'increase_percent',
            'regular_value' => 20,
            'discount_action' => 'set_percent',
            'discount_value' => 25,
        ])->assertOk();

        $this->assertEquals(12000, (float) $p1->fresh()->regular_price);
        $this->assertEquals(9000, (float) $p1->fresh()->sale_price);
    }
}
