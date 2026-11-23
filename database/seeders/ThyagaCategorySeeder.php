<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

/**
 * The main categories of mall.thyaga.lk that this store was missing.
 * Adds any that don't exist yet; existing ones keep their admin edits
 * (only a missing image is filled in, and the category is switched on).
 */
class ThyagaCategorySeeder extends Seeder
{
    /**
     * @var list<array{name: string, slug: string, icon: string, subtitle: string, color_from: string, color_to: string, sort_order: int, image: ?string}>
     */
    public const CATEGORIES = [
        ['name' => 'Gift', 'slug' => 'gift', 'icon' => 'Gift', 'subtitle' => 'Wrapped With Love', 'color_from' => '#f472b6', 'color_to' => '#9d174d', 'sort_order' => 7, 'image' => 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=400&q=80'],
        ['name' => 'Wellness', 'slug' => 'wellness', 'icon' => 'HeartPulse', 'subtitle' => 'Live Well', 'color_from' => '#fb7185', 'color_to' => '#e11d48', 'sort_order' => 8, 'image' => 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80'],
        ['name' => 'Gifts', 'slug' => 'gifts', 'icon' => 'PartyPopper', 'subtitle' => 'For Every Occasion', 'color_from' => '#fb923c', 'color_to' => '#c2410c', 'sort_order' => 9, 'image' => 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=400&q=80'],
        ['name' => 'Sports Nutrition', 'slug' => 'sports-nutrition', 'icon' => 'Dumbbell', 'subtitle' => 'Fuel Your Fitness', 'color_from' => '#a78bfa', 'color_to' => '#36135d', 'sort_order' => 10, 'image' => 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=400&q=80'],
        ['name' => 'Sports and Gaming', 'slug' => 'sports-and-gaming', 'icon' => 'Gamepad2', 'subtitle' => 'Play More', 'color_from' => '#818cf8', 'color_to' => '#4338ca', 'sort_order' => 11, 'image' => 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80'],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (self::CATEGORIES as $data) {
            $category = Category::firstOrCreate(
                ['slug' => $data['slug']],
                $data + ['parent_id' => null, 'is_active' => true, 'is_featured' => false, 'show_in_menu' => false],
            );

            if (! $category->wasRecentlyCreated) {
                $category->update([
                    'is_active' => true,
                    'image' => $category->image ?: $data['image'],
                ]);
            }
        }
    }
}
