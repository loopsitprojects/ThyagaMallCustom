<?php

namespace App\Console\Commands;

use App\Models\Admin;
use App\Models\Category;
use App\Models\FlashSale;
use App\Models\FlashSaleItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Voucher;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ImportThyagaCatalog extends Command
{
    protected $signature = 'thyaga:import-catalog';

    protected $description = 'Import real products and categories from thyaga_wp into the Thyaga Mall database';

    public function handle()
    {
        $this->info('Starting Thyaga Mall Catalog Import & Seeding...');

        // 1. Create the default admin only if missing — never reset an existing password.
        $admin = Admin::where('email', 'admin@thyaga.lk')->first();
        if (! $admin) {
            $initialPassword = Str::password(16);
            $admin = Admin::create([
                'email' => 'admin@thyaga.lk',
                'name' => 'Thyaga Mall Admin',
                'password' => Hash::make($initialPassword),
                'role' => 'super_admin',
                'status' => 'active',
                'avatar' => 'https://ui-avatars.com/api/?name=Thyaga+Admin&background=36135d&color=fff',
            ]);
            $this->warn("Admin created: admin@thyaga.lk / {$initialPassword}  (shown once — store it securely)");
        } else {
            $this->info('Admin admin@thyaga.lk already exists — password left unchanged.');
        }

        // 2. Create Vouchers
        Voucher::updateOrCreate(
            ['code' => 'THYAGA500'],
            [
                'title' => 'Rs. 500 Off Storewide',
                'discount_amount' => 500,
                'discount_type' => 'fixed',
                'min_order_amount' => 2500,
                'is_active' => true,
            ]
        );
        Voucher::updateOrCreate(
            ['code' => 'WELCOME10'],
            [
                'title' => '10% Welcome Discount',
                'discount_amount' => 10,
                'discount_type' => 'percentage',
                'min_order_amount' => 1500,
                'max_discount' => 1000,
                'is_active' => true,
            ]
        );
        Voucher::updateOrCreate(
            ['code' => 'MEGA1000'],
            [
                'title' => 'Mega Rs. 1,000 Voucher',
                'discount_amount' => 1000,
                'discount_type' => 'fixed',
                'min_order_amount' => 5000,
                'is_active' => true,
            ]
        );
        $this->info('Default Vouchers seeded.');

        // 3. Import Categories from thyaga_wp
        $this->info('Importing Categories from thyaga_wp...');
        try {
            $wpCategories = DB::select("
                SELECT t.term_id, t.name, t.slug, tt.parent, tt.description
                FROM thyaga_wp.wp_terms t
                JOIN thyaga_wp.wp_term_taxonomy tt ON t.term_id = tt.term_id
                WHERE tt.taxonomy = 'product_cat'
            ");

            $catMap = []; // old_id => new_id

            // First pass: parent categories
            foreach ($wpCategories as $cat) {
                if ($cat->parent == 0) {
                    $category = Category::updateOrCreate(
                        ['slug' => $cat->slug],
                        [
                            'name' => html_entity_decode($cat->name),
                            'parent_id' => null,
                            'description' => $cat->description ?: null,
                            'is_featured' => true,
                            'is_active' => true,
                        ]
                    );
                    $catMap[$cat->term_id] = $category->id;
                }
            }

            // Second pass: child categories
            foreach ($wpCategories as $cat) {
                if ($cat->parent != 0) {
                    $parentId = $catMap[$cat->parent] ?? null;
                    $category = Category::updateOrCreate(
                        ['slug' => $cat->slug],
                        [
                            'name' => html_entity_decode($cat->name),
                            'parent_id' => $parentId,
                            'description' => $cat->description ?: null,
                            'is_featured' => false,
                            'is_active' => true,
                        ]
                    );
                    $catMap[$cat->term_id] = $category->id;
                }
            }
            $this->info('Imported '.count($catMap).' categories.');

            // 4. Import Products from thyaga_wp
            $this->info('Importing Products from thyaga_wp...');
            $wpProducts = DB::select("
                SELECT p.ID, p.post_title, p.post_name, p.post_content, p.post_excerpt,
                       pm_price.meta_value as price,
                       pm_reg.meta_value as reg_price,
                       pm_sale.meta_value as sale_price,
                       pm_stock.meta_value as stock,
                       pm_sku.meta_value as sku,
                       pm_img.meta_value as thumb_id
                FROM thyaga_wp.wp_posts p
                LEFT JOIN thyaga_wp.wp_postmeta pm_price ON p.ID = pm_price.post_id AND pm_price.meta_key = '_price'
                LEFT JOIN thyaga_wp.wp_postmeta pm_reg ON p.ID = pm_reg.post_id AND pm_reg.meta_key = '_regular_price'
                LEFT JOIN thyaga_wp.wp_postmeta pm_sale ON p.ID = pm_sale.post_id AND pm_sale.meta_key = '_sale_price'
                LEFT JOIN thyaga_wp.wp_postmeta pm_stock ON p.ID = pm_stock.post_id AND pm_stock.meta_key = '_stock'
                LEFT JOIN thyaga_wp.wp_postmeta pm_sku ON p.ID = pm_sku.post_id AND pm_sku.meta_key = '_sku'
                LEFT JOIN thyaga_wp.wp_postmeta pm_img ON p.ID = pm_img.post_id AND pm_img.meta_key = '_thumbnail_id'
                WHERE p.post_type = 'product' AND p.post_status = 'publish'
            ");

            $importedCount = 0;
            $productModels = [];

            foreach ($wpProducts as $wpP) {
                $regularPrice = (float) ($wpP->reg_price ?: ($wpP->price ?: 1000));
                $salePrice = $wpP->sale_price ? (float) $wpP->sale_price : ($wpP->price && (float) $wpP->price < $regularPrice ? (float) $wpP->price : null);
                if ($salePrice >= $regularPrice) {
                    $salePrice = null;
                }

                // Find category
                $wpTermRel = DB::selectOne("
                    SELECT tr.term_taxonomy_id, tt.term_id
                    FROM thyaga_wp.wp_term_relationships tr
                    JOIN thyaga_wp.wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
                    WHERE tr.object_id = ? AND tt.taxonomy = 'product_cat'
                    LIMIT 1
                ", [$wpP->ID]);

                $categoryId = $wpTermRel && isset($catMap[$wpTermRel->term_id]) ? $catMap[$wpTermRel->term_id] : null;

                $product = Product::updateOrCreate(
                    ['slug' => $wpP->post_name ?: Str::slug($wpP->post_title)],
                    [
                        'category_id' => $categoryId,
                        'name' => html_entity_decode($wpP->post_title),
                        'sku' => $wpP->sku ?: 'THY-'.$wpP->ID,
                        'short_description' => strip_tags($wpP->post_excerpt ?: ''),
                        'description' => $wpP->post_content ?: $wpP->post_excerpt,
                        'regular_price' => $regularPrice,
                        'sale_price' => $salePrice,
                        'stock_quantity' => $wpP->stock !== null ? (int) $wpP->stock : rand(15, 60),
                        'low_stock_threshold' => 5,
                        'rating_avg' => round(4.5 + (rand(0, 5) / 10), 1),
                        'reviews_count' => rand(3, 48),
                        'is_featured' => rand(0, 10) > 7,
                        'is_active' => true,
                    ]
                );

                // Check thumbnail image
                if ($wpP->thumb_id) {
                    $imgRow = DB::selectOne('SELECT guid FROM thyaga_wp.wp_posts WHERE ID = ?', [$wpP->thumb_id]);
                    if ($imgRow && $imgRow->guid) {
                        $imgUrl = str_replace('http://store.thyaga.lk/', 'https://mall.thyaga.lk/', $imgRow->guid);
                        ProductImage::updateOrCreate(
                            ['product_id' => $product->id, 'is_primary' => true],
                            ['image_url' => $imgUrl, 'sort_order' => 0]
                        );
                    }
                }

                $productModels[] = $product;
                $importedCount++;
            }

            $this->info("Imported {$importedCount} real products.");

            // 5. Create ⚡ Flash Sale Campaign
            $this->info('Creating ⚡ Flash Sale Event...');
            $flashSale = FlashSale::updateOrCreate(
                ['title' => '⚡ Mega 24H Flash Deals'],
                [
                    'banner_url' => 'https://mall.thyaga.lk/wp-content/uploads/2026/06/Thyaga_mall_logo_LOGO_LOGO-1.png',
                    'start_time' => now()->subHours(2),
                    'end_time' => now()->addHours(22),
                    'is_active' => true,
                ]
            );

            // Add 8-12 top discounted products to this flash sale
            $flashProducts = Product::where('regular_price', '>', 500)
                ->inRandomOrder()
                ->take(12)
                ->get();

            FlashSaleItem::where('flash_sale_id', $flashSale->id)->delete();

            $sort = 0;
            foreach ($flashProducts as $fp) {
                // Calculate an attractive flash price (25% - 40% discount)
                $discountPercent = rand(25, 45);
                $flashPrice = round($fp->regular_price * (1 - ($discountPercent / 100)));
                $qtyLimit = rand(15, 30);
                $qtySold = rand(5, $qtyLimit - 2);

                FlashSaleItem::create([
                    'flash_sale_id' => $flashSale->id,
                    'product_id' => $fp->id,
                    'flash_price' => $flashPrice,
                    'quantity_limit' => $qtyLimit,
                    'quantity_sold' => $qtySold,
                    'sort_order' => $sort++,
                ]);
            }
            $this->info('⚡ Flash Sale populated with '.count($flashProducts).' items.');

        } catch (\Exception $e) {
            $this->error('Error importing catalog: '.$e->getMessage());
        }

        $this->info('Thyaga Mall setup & import complete!');

        return Command::SUCCESS;
    }
}
