<?php

namespace Database\Seeders;

use App\Models\Merchant;
use App\Models\Product;
use Illuminate\Database\Seeder;

class MerchantSeeder extends Seeder
{
    public function run(): void
    {
        $merchants = [
            [
                'name' => 'Spa Ceylon Luxury Ayurveda',
                'slug' => 'spa-ceylon',
                'code' => 'MER-SPC-01',
                'business_type' => 'Wellness & Beauty',
                'contact_person' => 'Dilini Wickramasinghe',
                'email' => 'partnerships@spaceylon.com',
                'phone' => '+94 11 258 7777',
                'city' => 'Colombo 07',
                'address' => 'No. 14, Ward Place, Colombo 07',
                'commission_rate' => 12.00,
                'logo_url' => 'https://ui-avatars.com/api/?name=Spa+Ceylon&background=0f766e&color=fff&size=200',
                'description' => 'World-renowned Sri Lankan luxury Ayurveda brand offering premium body care, fragrances, and gift collections.',
                'status' => 'active',
                'is_featured' => true,
            ],
            [
                'name' => 'Odel Department Store',
                'slug' => 'odel',
                'code' => 'MER-ODL-02',
                'business_type' => 'Fashion & Lifestyle',
                'contact_person' => 'Sanjeewa Fernando',
                'email' => 'merchant@odel.lk',
                'phone' => '+94 11 462 5800',
                'city' => 'Colombo 03',
                'address' => 'No. 5, Alexandra Place, Colombo 07',
                'commission_rate' => 10.00,
                'logo_url' => 'https://ui-avatars.com/api/?name=Odel&background=1e1b4b&color=fff&size=200',
                'description' => 'Sri Lanka premier fashion and department store offering international apparel, accessories, and curated gift hampers.',
                'status' => 'active',
                'is_featured' => true,
            ],
            [
                'name' => 'Dilmah Fine Teas & Gourmet',
                'slug' => 'dilmah-fine-teas',
                'code' => 'MER-DLM-03',
                'business_type' => 'Gourmet Food & Beverages',
                'contact_person' => 'Merrill Silva',
                'email' => 'orders@dilmahtea.com',
                'phone' => '+94 11 482 2000',
                'city' => 'Peliyagoda',
                'address' => '111 Negombo Road, Peliyagoda',
                'commission_rate' => 8.50,
                'logo_url' => 'https://ui-avatars.com/api/?name=Dilmah+Tea&background=15803d&color=fff&size=200',
                'description' => 'Single-origin Ceylon tea growers and blenders, providing fresh gourmet tea packs, caddies, and gift tins.',
                'status' => 'active',
                'is_featured' => true,
            ],
            [
                'name' => 'Singer Sri Lanka',
                'slug' => 'singer-sri-lanka',
                'code' => 'MER-SNG-04',
                'business_type' => 'Electronics & Home',
                'contact_person' => 'Mahesh Perera',
                'email' => 'commercial@singersl.com',
                'phone' => '+94 11 540 0400',
                'city' => 'Colombo 02',
                'address' => 'No. 80, Nawam Mawatha, Colombo 02',
                'commission_rate' => 7.00,
                'logo_url' => 'https://ui-avatars.com/api/?name=Singer+SL&background=b91c1c&color=fff&size=200',
                'description' => 'Household name in electronics, home appliances, smartphones, and entertainment systems.',
                'status' => 'active',
                'is_featured' => true,
            ],
            [
                'name' => 'Keells Gourmet Pantry',
                'slug' => 'keells-gourmet',
                'code' => 'MER-KLS-05',
                'business_type' => 'Groceries & Delicacies',
                'contact_person' => 'Chaminda Jayasuriya',
                'email' => 'supply@keells.com',
                'phone' => '+94 11 230 3500',
                'city' => 'Wattala',
                'address' => 'Keells Headquarters, Colombo',
                'commission_rate' => 9.00,
                'logo_url' => 'https://ui-avatars.com/api/?name=Keells&background=047857&color=fff&size=200',
                'description' => 'Top supermarket chain delivering imported sweets, festive snack hampers, nuts, and household provisions.',
                'status' => 'active',
                'is_featured' => false,
            ],
            [
                'name' => 'Damro Living & Office',
                'slug' => 'damro-living',
                'code' => 'MER-DMR-06',
                'business_type' => 'Furniture & Living',
                'contact_person' => 'Rukshan Alwis',
                'email' => 'sales@damro.lk',
                'phone' => '+94 33 228 6200',
                'city' => 'Nittambuwa',
                'address' => 'Damro Complex, Kandy Road, Nittambuwa',
                'commission_rate' => 11.00,
                'logo_url' => 'https://ui-avatars.com/api/?name=Damro&background=c2410c&color=fff&size=200',
                'description' => 'South Asia largest furniture manufacturer offering ergonomic home & office items.',
                'status' => 'active',
                'is_featured' => false,
            ],
            [
                'name' => 'Bake House Artisan Confectionery',
                'slug' => 'bake-house',
                'code' => 'MER-BKH-07',
                'business_type' => 'Cakes & Sweet Treats',
                'contact_person' => 'Nirmala Senanayake',
                'email' => 'orders@bakehouse.lk',
                'phone' => '+94 81 223 4567',
                'city' => 'Kandy',
                'address' => 'Dalada Veediya, Kandy',
                'commission_rate' => 15.00,
                'logo_url' => 'https://ui-avatars.com/api/?name=Bake+House&background=7c2d12&color=fff&size=200',
                'description' => 'Artisan bakery specializing in signature celebration cakes, cookies, chocolates, and confectionery gifts.',
                'status' => 'pending',
                'is_featured' => false,
            ],
            [
                'name' => 'Stone & String Jewellers',
                'slug' => 'stone-and-string',
                'code' => 'MER-SNS-08',
                'business_type' => 'Jewellery & Accessories',
                'contact_person' => 'Priyani De Silva',
                'email' => 'partner@stoneandstring.com',
                'phone' => '+94 11 250 1234',
                'city' => 'Colombo 04',
                'address' => 'R.A. De Mel Mawatha, Colombo 04',
                'commission_rate' => 14.00,
                'logo_url' => 'https://ui-avatars.com/api/?name=Stone+String&background=4c1d95&color=fff&size=200',
                'description' => 'Trendy fashion jewellery, semi-precious accessories, watches, and personalized keepsake gifts.',
                'status' => 'active',
                'is_featured' => true,
            ],
        ];

        foreach ($merchants as $data) {
            Merchant::updateOrCreate(['slug' => $data['slug']], $data);
        }

        // Assign some existing products to these merchants so counts and relations are populated
        $allMerchants = Merchant::all();
        if ($allMerchants->count() > 0) {
            $products = Product::whereNull('merchant_id')->take(50)->get();
            foreach ($products as $index => $product) {
                $merchant = $allMerchants[$index % $allMerchants->count()];
                $product->update(['merchant_id' => $merchant->id]);
            }
        }
    }
}
