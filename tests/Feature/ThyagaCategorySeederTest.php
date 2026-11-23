<?php

namespace Tests\Feature;

use App\Models\Category;
use Database\Seeders\ThyagaCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThyagaCategorySeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_missing_thyaga_categories_are_added_and_shown_on_the_storefront(): void
    {
        $this->seed(ThyagaCategorySeeder::class);

        $this->assertSame(
            ['Gift', 'Wellness', 'Gifts', 'Sports Nutrition', 'Sports and Gaming'],
            Category::orderBy('sort_order')->pluck('name')->all(),
        );
        $this->assertStringContainsString('images.unsplash.com', (string) Category::where('slug', 'sports-and-gaming')->value('image'));
        $this->assertNotNull(Category::where('slug', 'gifts')->value('image'));

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonFragment(['slug' => 'sports-and-gaming'])
            ->assertJsonFragment(['slug' => 'gift']);
    }

    public function test_existing_categories_keep_their_admin_edits(): void
    {
        Category::create([
            'name' => 'Gift & Hampers', 'slug' => 'gifts', 'image' => 'https://example.com/hamper.jpg',
            'subtitle' => 'Hand-picked', 'sort_order' => 3, 'is_active' => false,
        ]);
        Category::create(['name' => 'Wellness', 'slug' => 'wellness', 'image' => null, 'sort_order' => 2]);

        $this->seed(ThyagaCategorySeeder::class);

        $gifts = Category::where('slug', 'gifts')->sole();
        $this->assertSame('Gift & Hampers', $gifts->name);
        $this->assertSame('https://example.com/hamper.jpg', $gifts->image);
        $this->assertSame('Hand-picked', $gifts->subtitle);
        $this->assertTrue($gifts->is_active);

        $this->assertStringContainsString('images.unsplash.com', (string) Category::where('slug', 'wellness')->value('image'));
    }

    public function test_running_it_again_adds_nothing_new(): void
    {
        $this->seed(ThyagaCategorySeeder::class);
        $this->seed(ThyagaCategorySeeder::class);

        $this->assertSame(5, Category::count());
    }
}
