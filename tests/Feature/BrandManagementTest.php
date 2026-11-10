<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BrandManagementTest extends TestCase
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

    public function test_guests_cannot_access_admin_brands(): void
    {
        $this->getJson('/api/admin/brands')->assertUnauthorized();
    }

    public function test_customers_cannot_access_admin_brands(): void
    {
        $token = User::create([
            'name' => 'Customer',
            'email' => 'customer@example.com',
            'password' => Hash::make('secret-123'),
            'role' => 'customer',
            'status' => 'active',
        ])->createToken('customer-token', ['customer'])->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/brands')->assertForbidden();
    }

    public function test_admin_can_list_brands_with_stats(): void
    {
        $token = $this->adminToken();

        Brand::create([
            'name' => 'Samsung',
            'slug' => 'samsung',
            'is_featured' => true,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        Brand::create([
            'name' => 'Apple',
            'slug' => 'apple',
            'is_featured' => true,
            'is_active' => true,
            'sort_order' => 2,
        ]);

        Brand::create([
            'name' => 'Old Brand',
            'slug' => 'old-brand',
            'is_featured' => false,
            'is_active' => false,
            'sort_order' => 3,
        ]);

        $response = $this->withToken($token)->getJson('/api/admin/brands');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('stats.total', 3)
            ->assertJsonPath('stats.featured', 2)
            ->assertJsonPath('stats.active', 2)
            ->assertJsonPath('stats.inactive', 1);
    }

    public function test_admin_can_create_brand(): void
    {
        $token = $this->adminToken();

        $response = $this->withToken($token)->postJson('/api/admin/brands', [
            'name' => 'Sony',
            'website_url' => 'https://sony.com',
            'description' => 'Electronics maker',
            'is_featured' => true,
            'is_active' => true,
            'sort_order' => 5,
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Sony')
            ->assertJsonPath('data.slug', 'sony')
            ->assertJsonPath('data.sort_order', 5);

        $this->assertDatabaseHas('brands', [
            'name' => 'Sony',
            'slug' => 'sony',
            'website_url' => 'https://sony.com',
            'description' => 'Electronics maker',
            'is_featured' => true,
            'is_active' => true,
            'sort_order' => 5,
        ]);
    }

    public function test_admin_can_update_brand(): void
    {
        $token = $this->adminToken();

        $brand = Brand::create([
            'name' => 'Initial Brand',
            'slug' => 'initial-brand',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $response = $this->withToken($token)->putJson("/api/admin/brands/{$brand->id}", [
            'name' => 'Updated Brand',
            'website_url' => 'https://example.com',
            'description' => 'Updated description',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Updated Brand')
            ->assertJsonPath('data.website_url', 'https://example.com');

        $this->assertDatabaseHas('brands', [
            'id' => $brand->id,
            'name' => 'Updated Brand',
            'description' => 'Updated description',
        ]);
    }

    public function test_admin_can_toggle_featured_and_status(): void
    {
        $token = $this->adminToken();

        $brand = Brand::create([
            'name' => 'Test Toggle',
            'slug' => 'test-toggle',
            'is_featured' => false,
            'is_active' => true,
        ]);

        // Toggle featured on
        $this->withToken($token)
            ->patchJson("/api/admin/brands/{$brand->id}/toggle-featured")
            ->assertOk()
            ->assertJsonPath('data.is_featured', true);

        $this->assertTrue($brand->fresh()->is_featured);

        // Toggle active off
        $this->withToken($token)
            ->patchJson("/api/admin/brands/{$brand->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertFalse($brand->fresh()->is_active);
    }

    public function test_admin_can_reorder_brands(): void
    {
        $token = $this->adminToken();

        $b1 = Brand::create(['name' => 'B1', 'slug' => 'b1', 'sort_order' => 1]);
        $b2 = Brand::create(['name' => 'B2', 'slug' => 'b2', 'sort_order' => 2]);
        $b3 = Brand::create(['name' => 'B3', 'slug' => 'b3', 'sort_order' => 3]);

        $this->withToken($token)
            ->putJson('/api/admin/brands/reorder', [
                'ids' => [$b3->id, $b1->id, $b2->id],
            ])
            ->assertOk();

        $this->assertEquals(1, $b3->fresh()->sort_order);
        $this->assertEquals(2, $b1->fresh()->sort_order);
        $this->assertEquals(3, $b2->fresh()->sort_order);
    }

    public function test_deleting_brand_nullifies_product_association(): void
    {
        $token = $this->adminToken();

        $category = Category::create([
            'name' => 'Electronics',
            'slug' => 'electronics',
            'is_active' => true,
        ]);

        $brand = Brand::create([
            'name' => 'Brand To Delete',
            'slug' => 'brand-to-delete',
            'is_active' => true,
        ]);

        $product = Product::create([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'Test Product',
            'slug' => 'test-product',
            'regular_price' => 5000,
            'is_active' => true,
        ]);

        $this->withToken($token)
            ->deleteJson("/api/admin/brands/{$brand->id}")
            ->assertOk();

        $this->assertDatabaseMissing('brands', ['id' => $brand->id]);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'brand_id' => null,
        ]);
    }

    public function test_public_brands_endpoint_returns_only_active_ordered_brands(): void
    {
        Brand::create(['name' => 'B Active 2', 'slug' => 'b-act-2', 'sort_order' => 2, 'is_active' => true]);
        Brand::create(['name' => 'A Active 1', 'slug' => 'a-act-1', 'sort_order' => 1, 'is_active' => true]);
        Brand::create(['name' => 'Inactive', 'slug' => 'inactive', 'sort_order' => 0, 'is_active' => false]);

        $response = $this->getJson('/api/brands');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.slug', 'a-act-1')
            ->assertJsonPath('data.1.slug', 'b-act-2');
    }
}
