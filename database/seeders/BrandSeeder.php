<?php

namespace Database\Seeders;

use App\Models\Brand;
use Illuminate\Database\Seeder;

class BrandSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $brands = [
            [
                'name' => 'Samsung',
                'slug' => 'samsung',
                'is_featured' => true,
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'name' => 'Apple',
                'slug' => 'apple',
                'is_featured' => true,
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'name' => 'HP',
                'slug' => 'hp',
                'is_featured' => true,
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'name' => 'Xiaomi',
                'slug' => 'mi',
                'is_featured' => true,
                'sort_order' => 4,
                'is_active' => true,
            ],
            [
                'name' => 'Lenovo',
                'slug' => 'lenovo',
                'is_featured' => true,
                'sort_order' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'Nike',
                'slug' => 'nike',
                'is_featured' => true,
                'sort_order' => 6,
                'is_active' => true,
            ],
            [
                'name' => 'Adidas',
                'slug' => 'adidas',
                'is_featured' => true,
                'sort_order' => 7,
                'is_active' => true,
            ],
            [
                'name' => 'Tefal',
                'slug' => 'tefal',
                'is_featured' => true,
                'sort_order' => 8,
                'is_active' => true,
            ],
            [
                'name' => 'Philips',
                'slug' => 'philips',
                'is_featured' => true,
                'sort_order' => 9,
                'is_active' => true,
            ],
            [
                'name' => 'LEGO',
                'slug' => 'lego',
                'is_featured' => true,
                'sort_order' => 10,
                'is_active' => true,
            ],
            [
                'name' => 'Google',
                'slug' => 'google',
                'is_featured' => false,
                'sort_order' => 11,
                'is_active' => true,
            ],
            [
                'name' => 'Cadbury',
                'slug' => 'cadbury',
                'is_featured' => false,
                'sort_order' => 12,
                'is_active' => true,
            ],
            [
                'name' => 'JOYROOM',
                'slug' => 'joyroom',
                'is_featured' => false,
                'sort_order' => 13,
                'is_active' => true,
            ],
            [
                'name' => 'BAVIN',
                'slug' => 'bavin',
                'is_featured' => false,
                'sort_order' => 14,
                'is_active' => true,
            ],
            [
                'name' => 'Porodo',
                'slug' => 'porodo',
                'is_featured' => false,
                'sort_order' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'Buldak',
                'slug' => 'buldak',
                'is_featured' => false,
                'sort_order' => 16,
                'is_active' => true,
            ],
            [
                'name' => 'Abans',
                'slug' => 'abans',
                'is_featured' => false,
                'sort_order' => 17,
                'is_active' => true,
            ],
            [
                'name' => 'suriyas',
                'slug' => 'suriyas',
                'is_featured' => false,
                'sort_order' => 18,
                'is_active' => true,
            ],
            [
                'name' => 'Surya ProShield',
                'slug' => 'surya-proshield',
                'is_featured' => false,
                'sort_order' => 19,
                'is_active' => true,
            ],
        ];

        foreach ($brands as $brandData) {
            Brand::updateOrCreate(
                ['slug' => $brandData['slug']],
                $brandData
            );
        }
    }
}
