<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Storefront look of each category as previously hard-coded in the frontend:
     * slug => [sort_order, icon, color_from, color_to, subtitle, image, show_in_menu].
     *
     * @var array<string, array{0: int, 1: string, 2: ?string, 3: ?string, 4: ?string, 5: ?string, 6: bool}>
     */
    private const DEFAULTS = [
        'home' => [1, 'Sofa', '#2dd4bf', '#0d9488', 'Make it a Home', 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80', true],
        'electronics' => [2, 'Laptop', '#60a5fa', '#2563eb', 'Latest Gadgets', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80', true],
        'beauty' => [3, 'Sparkles', '#f9a8d4', '#db2777', 'Feel Your Best', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=80', true],
        'fashion' => [4, 'Shirt', '#c084fc', '#7c3aed', 'Trendy Styles', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=400&q=80', true],
        'toys' => [5, 'ToyBrick', '#fcd34d', '#f59e0b', 'Play & Learn', 'https://images.unsplash.com/photo-1558877385-81a1c7e67d72?auto=format&fit=crop&w=400&q=80', false],
        'food' => [6, 'ShoppingBasket', '#4ade80', '#16a34a', 'Daily Essentials', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80', true],
        'gaming' => [7, 'Gamepad2', '#818cf8', '#4338ca', 'Play More', 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=400&q=80', false],
        'gifts' => [8, 'Gift', '#fb923c', '#c2410c', 'For Every Occasion', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80', false],
        'wellness' => [9, 'HeartPulse', '#fb7185', '#e11d48', 'Live Well', null, false],
        'sports-nutrition' => [10, 'Dumbbell', '#a78bfa', '#36135d', 'Fuel Your Fitness', null, false],
        'kitchen' => [1, 'CookingPot', null, null, null, null, false],
        'living' => [2, 'Lamp', null, null, null, null, false],
        'accessories-electronics' => [1, 'Headphones', null, null, null, null, false],
        'appliances' => [2, 'Refrigerator', null, null, null, null, false],
        'perfumes' => [1, 'SprayCan', null, null, null, null, false],
        'personalcare' => [2, 'Droplet', null, null, null, null, false],
        'footwear' => [1, 'Footprints', null, null, null, null, false],
        'lifestyle' => [2, 'Glasses', null, null, null, null, false],
        'books' => [1, 'BookOpen', null, null, null, null, false],
        'entertainment' => [2, 'Clapperboard', null, null, null, null, false],
        'confectionery' => [1, 'Candy', null, null, null, null, false],
        'beverages' => [2, 'CupSoda', null, null, null, null, false],
        'playstation' => [1, 'Gamepad', null, null, null, null, false],
        'nintendo' => [2, 'Joystick', null, null, null, null, false],
        'ps5-games' => [1, 'Disc', null, null, null, null, false],
        'ps4-games' => [2, 'Disc', null, null, null, null, false],
        'hamper' => [1, 'Package', null, null, null, null, false],
        'sports-supplements' => [1, 'Pill', null, null, null, null, false],
    ];

    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('subtitle', 80)->nullable()->after('description');
            $table->string('color_from', 7)->nullable()->after('subtitle');
            $table->string('color_to', 7)->nullable()->after('color_from');
            $table->boolean('show_in_menu')->default(false)->after('is_featured');
        });

        // Only fill blanks, so re-running on a server where admins already edited categories is harmless.
        foreach (self::DEFAULTS as $slug => [$sort, $icon, $from, $to, $subtitle, $image, $inMenu]) {
            $category = DB::table('categories')->where('slug', $slug)->first();
            if (! $category) {
                continue;
            }

            DB::table('categories')->where('id', $category->id)->update(array_filter([
                'sort_order' => $category->sort_order ?: $sort,
                'icon' => $category->icon ?: $icon,
                'color_from' => $from,
                'color_to' => $to,
                'subtitle' => $subtitle,
                'image' => $category->image ?: $image,
                'show_in_menu' => $inMenu,
            ], fn ($value) => $value !== null));
        }
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn(['subtitle', 'color_from', 'color_to', 'show_in_menu']);
        });
    }
};
