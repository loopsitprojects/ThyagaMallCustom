<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        return Admin::create([
            'name' => 'Editor', 'email' => 'editor@thyaga.lk', 'password' => Hash::make('admin-pass-123'),
            'role' => 'editor', 'status' => 'active',
        ])->createToken('admin-token', ['admin'])->plainTextToken;
    }

    private function category(string $name, ?Category $parent = null, array $attributes = []): Category
    {
        return Category::create(array_merge([
            'name' => $name,
            'slug' => str($name)->slug()->toString(),
            'parent_id' => $parent?->id,
            'is_active' => true,
        ], $attributes));
    }

    private function product(Category $category): Product
    {
        return Product::create([
            'category_id' => $category->id, 'name' => "Item in {$category->name}",
            'slug' => 'item-'.uniqid(), 'regular_price' => 1000, 'is_active' => true,
        ]);
    }

    public function test_guests_get_401_when_creating_a_category(): void
    {
        $this->postJson('/api/admin/categories', ['name' => 'Toys'])->assertUnauthorized();
    }

    public function test_customers_get_403_when_creating_a_category(): void
    {
        $token = User::create([
            'name' => 'C', 'email' => 'c@example.com', 'password' => Hash::make('x-pass-123'),
            'role' => 'customer', 'status' => 'active',
        ])->createToken('customer-token', ['customer'])->plainTextToken;

        $this->withToken($token)->postJson('/api/admin/categories', ['name' => 'Toys'])->assertForbidden();
        $this->assertDatabaseCount('categories', 0);
    }

    public function test_admin_creates_a_sub_category_with_a_unique_generated_slug(): void
    {
        $home = $this->category('Home');
        $this->category('Kitchen', $home);

        $response = $this->withToken($this->adminToken())->postJson('/api/admin/categories', [
            'name' => 'Kitchen', 'parent_id' => $home->id, 'icon' => 'CookingPot',
            'color_from' => '#2dd4bf', 'color_to' => '#0d9488', 'show_in_menu' => true,
        ]);

        $response->assertCreated()->assertJsonPath('data.slug', 'kitchen-2');
        $this->assertDatabaseHas('categories', [
            'slug' => 'kitchen-2', 'parent_id' => $home->id, 'icon' => 'CookingPot', 'show_in_menu' => true,
        ]);
    }

    public function test_creating_a_category_without_a_name_returns_422(): void
    {
        $this->withToken($this->adminToken())->postJson('/api/admin/categories', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'The name field is required.']);
    }

    public function test_unknown_icons_are_rejected_with_422(): void
    {
        $this->withToken($this->adminToken())->postJson('/api/admin/categories', ['name' => 'Toys', 'icon' => 'NotAnIcon'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['icon' => 'The selected icon is invalid.']);
    }

    public function test_unsafe_image_links_are_rejected_with_422(): void
    {
        $this->withToken($this->adminToken())->postJson('/api/admin/categories', ['name' => 'Toys', 'image' => 'javascript:alert(1)'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['image' => 'The image field format is invalid.']);
    }

    public function test_moving_a_category_inside_its_own_sub_category_returns_422(): void
    {
        $gaming = $this->category('Gaming');
        $playstation = $this->category('PlayStation', $gaming);
        $ps5 = $this->category('PS5 Games', $playstation);

        $this->withToken($this->adminToken())->putJson("/api/admin/categories/{$gaming->id}", ['parent_id' => $ps5->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['parent_id' => 'A category cannot be moved inside itself or one of its own sub-categories.']);
        $this->assertNull($gaming->fresh()->parent_id);
    }

    public function test_admin_updates_a_category(): void
    {
        $toys = $this->category('Toys');

        $this->withToken($this->adminToken())->putJson("/api/admin/categories/{$toys->id}", [
            'name' => 'Toys & Kids', 'subtitle' => 'Play & Learn', 'is_active' => false,
        ])->assertOk()->assertJsonPath('data.name', 'Toys & Kids');

        $this->assertDatabaseHas('categories', [
            'id' => $toys->id, 'name' => 'Toys & Kids', 'subtitle' => 'Play & Learn', 'is_active' => false, 'slug' => 'toys',
        ]);
    }

    public function test_deleting_a_category_with_products_returns_422(): void
    {
        $food = $this->category('Food');
        $this->product($food);

        $this->withToken($this->adminToken())->deleteJson("/api/admin/categories/{$food->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category' => "1 product in 'Food'. Move it to another category first, or hide this category instead."]);
        $this->assertModelExists($food);
    }

    public function test_deleting_a_category_with_sub_categories_returns_422(): void
    {
        $food = $this->category('Food');
        $this->category('Beverages', $food);

        $this->withToken($this->adminToken())->deleteJson("/api/admin/categories/{$food->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category' => "'Food' still has 1 sub-category. Move or delete them first."]);
        $this->assertModelExists($food);
    }

    public function test_admin_deletes_an_empty_category(): void
    {
        $gifts = $this->category('Gifts');

        $this->withToken($this->adminToken())->deleteJson("/api/admin/categories/{$gifts->id}")->assertOk();

        $this->assertModelMissing($gifts);
    }

    public function test_admin_reorders_categories(): void
    {
        $first = $this->category('Home');
        $second = $this->category('Electronics');

        $this->withToken($this->adminToken())->putJson('/api/admin/categories/reorder', ['ids' => [$second->id, $first->id]])
            ->assertOk();

        $this->assertSame(1, $second->fresh()->sort_order);
        $this->assertSame(2, $first->fresh()->sort_order);
    }

    public function test_public_tree_nests_sub_categories_hides_inactive_ones_and_totals_products(): void
    {
        $gaming = $this->category('Gaming');
        $playstation = $this->category('PlayStation', $gaming);
        $ps5 = $this->category('PS5 Games', $playstation);
        $this->category('Retro', $gaming, ['is_active' => false]);
        $this->product($gaming);
        $this->product($ps5);
        $this->product($ps5);

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonCount(1, 'data.0.children')
            ->assertJsonPath('data.0.children.0.children.0.slug', 'ps5-games')
            ->assertJsonPath('data.0.total_products_count', 3)
            ->assertJsonPath('data.0.products_count', 1);
    }

    public function test_filtering_products_by_a_category_includes_every_sub_category_level(): void
    {
        $gaming = $this->category('Gaming');
        $ps5 = $this->category('PS5 Games', $this->category('PlayStation', $gaming));
        $game = $this->product($ps5);
        $this->product($this->category('Food'));

        $this->getJson('/api/products?category=gaming')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $game->id);
    }
}
