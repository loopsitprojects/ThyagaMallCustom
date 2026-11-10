<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Category;
use App\Models\HomeSectionProduct;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class HomeSectionTest extends TestCase
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
    private function product(string $name, array $attributes = []): Product
    {
        return Product::create(array_merge([
            'name' => $name, 'slug' => str($name)->slug()->toString(), 'regular_price' => 1000, 'is_active' => true,
        ], $attributes));
    }

    private function pick(string $section, Product $product, int $sortOrder = 0): void
    {
        HomeSectionProduct::create(['section' => $section, 'product_id' => $product->id, 'sort_order' => $sortOrder]);
    }

    public function test_section_without_picks_shows_the_most_reviewed_products(): void
    {
        $this->product('Quiet', ['reviews_count' => 1]);
        $popular = $this->product('Popular', ['reviews_count' => 50]);

        $this->getJson('/api/home-sections/trending')
            ->assertOk()
            ->assertJsonPath('curated', false)
            ->assertJsonPath('data.0.id', $popular->id);
    }

    public function test_section_shows_only_active_picks_in_their_saved_order(): void
    {
        $this->product('Popular but not picked', ['reviews_count' => 99]);
        $second = $this->product('Second');
        $first = $this->product('First');
        $hidden = $this->product('Hidden', ['is_active' => false]);
        $this->pick(HomeSectionProduct::TRENDING, $second, 2);
        $this->pick(HomeSectionProduct::TRENDING, $first, 1);
        $this->pick(HomeSectionProduct::TRENDING, $hidden, 0);

        $this->getJson('/api/home-sections/trending')
            ->assertJsonPath('curated', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $first->id)
            ->assertJsonPath('data.1.id', $second->id);
    }

    public function test_section_falls_back_when_every_pick_is_hidden(): void
    {
        $visible = $this->product('Visible');
        $this->pick(HomeSectionProduct::TRENDING, $this->product('Hidden', ['is_active' => false]));

        $this->getJson('/api/home-sections/trending')
            ->assertJsonPath('curated', false)
            ->assertJsonPath('data.0.id', $visible->id);
    }

    public function test_sections_keep_separate_lists(): void
    {
        $trending = $this->product('Trending pick');
        $bestSeller = $this->product('Best seller pick');
        $this->pick(HomeSectionProduct::TRENDING, $trending);
        $this->pick(HomeSectionProduct::BEST_SELLERS, $bestSeller);

        $this->getJson('/api/home-sections/best_sellers')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $bestSeller->id);
    }

    public function test_section_displays_at_most_six_products(): void
    {
        foreach (range(1, 7) as $number) {
            $this->pick(HomeSectionProduct::TRENDING, $this->product("Pick {$number}"), $number);
        }

        $this->getJson('/api/home-sections/trending')
            ->assertJsonCount(HomeSectionProduct::DISPLAY_LIMIT, 'data')
            ->assertJsonPath('data.5.name', 'Pick 6');
    }

    public function test_category_tab_shows_picks_from_that_category_and_its_children(): void
    {
        $parent = Category::create(['name' => 'Electronics', 'slug' => 'electronics']);
        $child = Category::create(['name' => 'Audio', 'slug' => 'audio', 'parent_id' => $parent->id]);
        $other = Category::create(['name' => 'Food', 'slug' => 'food']);
        $inChild = $this->product('Speaker', ['category_id' => $child->id]);
        $this->pick(HomeSectionProduct::BEST_SELLERS, $this->product('Tea', ['category_id' => $other->id]), 0);
        $this->pick(HomeSectionProduct::BEST_SELLERS, $inChild, 1);

        $this->getJson('/api/home-sections/best_sellers?category=electronics')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $inChild->id);

        $this->getJson('/api/home-sections/best_sellers?category=unknown')->assertJsonCount(0, 'data');
    }

    public function test_admin_can_add_reorder_and_remove_products(): void
    {
        $token = $this->adminToken();
        $first = $this->product('First');
        $second = $this->product('Second');

        $this->withToken($token)->postJson('/api/admin/home-sections/trending/products', ['product_id' => $first->id])->assertCreated();
        $this->withToken($token)->postJson('/api/admin/home-sections/trending/products', ['product_id' => $second->id])
            ->assertCreated()
            ->assertJsonPath('data.1.id', $second->id);

        $this->withToken($token)->putJson('/api/admin/home-sections/trending/reorder', ['ids' => [$second->id, $first->id]])
            ->assertOk()
            ->assertJsonPath('data.0.id', $second->id);

        $this->withToken($token)->deleteJson("/api/admin/home-sections/trending/products/{$second->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->withToken($token)->getJson('/api/admin/home-sections')
            ->assertOk()
            ->assertJsonPath('data.trending.0.id', $first->id)
            ->assertJsonCount(0, 'data.best_sellers');
    }

    public function test_product_can_be_in_both_sections_but_only_once_in_each(): void
    {
        $token = $this->adminToken();
        $product = $this->product('Hamper');
        $this->pick(HomeSectionProduct::TRENDING, $product);

        $this->withToken($token)->postJson('/api/admin/home-sections/trending/products', ['product_id' => $product->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('product_id');

        $this->withToken($token)->postJson('/api/admin/home-sections/best_sellers/products', ['product_id' => $product->id])
            ->assertCreated();
    }

    public function test_hidden_and_missing_products_cannot_be_added(): void
    {
        $token = $this->adminToken();
        $hidden = $this->product('Hidden', ['is_active' => false]);

        $this->withToken($token)->postJson('/api/admin/home-sections/trending/products', ['product_id' => $hidden->id])
            ->assertUnprocessable()->assertJsonValidationErrors('product_id');
        $this->withToken($token)->postJson('/api/admin/home-sections/trending/products', ['product_id' => 999999])
            ->assertUnprocessable()->assertJsonValidationErrors('product_id');
    }

    public function test_reorder_must_list_exactly_the_products_in_the_section(): void
    {
        $token = $this->adminToken();
        $picked = $this->product('Picked');
        $other = $this->product('Other');
        $this->pick(HomeSectionProduct::TRENDING, $picked);

        $this->withToken($token)->putJson('/api/admin/home-sections/trending/reorder', ['ids' => [$picked->id, $other->id]])
            ->assertUnprocessable();
    }

    public function test_deleting_a_product_removes_it_from_sections(): void
    {
        $product = $this->product('Soon gone');
        $this->pick(HomeSectionProduct::TRENDING, $product);

        $product->delete();

        $this->assertDatabaseCount('home_section_products', 0);
    }

    public function test_unknown_sections_are_not_found(): void
    {
        $this->getJson('/api/home-sections/flash')->assertNotFound();
        $this->withToken($this->adminToken())->postJson('/api/admin/home-sections/flash/products', ['product_id' => 1])->assertNotFound();
    }

    public function test_customers_and_guests_cannot_manage_sections(): void
    {
        $product = $this->product('Hamper');
        $this->postJson('/api/admin/home-sections/trending/products', ['product_id' => $product->id])->assertUnauthorized();

        $customer = User::create([
            'name' => 'C', 'email' => 'c@example.com', 'password' => Hash::make('x-pass-123'),
            'role' => 'customer', 'status' => 'active',
        ])->createToken('customer-token', ['customer'])->plainTextToken;

        $this->withToken($customer)->postJson('/api/admin/home-sections/trending/products', ['product_id' => $product->id])->assertForbidden();
        $this->assertDatabaseCount('home_section_products', 0);
    }
}
