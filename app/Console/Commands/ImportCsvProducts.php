<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\Category;
use App\Models\FlashSale;
use App\Models\FlashSaleItem;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportCsvProducts extends Command
{
    protected $signature = 'thyaga:import-csv {file? : Path to the CSV file}';

    protected $description = 'Remove all existing products and import the full product catalog from the specified CSV file';

    public function handle()
    {
        $filePath = $this->argument('file');
        if (! $filePath) {
            $defaultPaths = [
                base_path('database_dump/Products-Export-2026-October-29-1357.csv'),
                base_path('database_dump/Products-Export-2026-October-22-1422.csv'),
                '/Users/dilmith/Downloads/Products-Export-2026-October-29-1357.csv',
                '/Users/dilmith/Downloads/Products-Export-2026-October-22-1422.csv',
            ];
            foreach ($defaultPaths as $p) {
                if (file_exists($p)) {
                    $filePath = $p;
                    break;
                }
            }
        }

        if (! $filePath || ! file_exists($filePath)) {
            $this->error("CSV file not found at: {$filePath}");

            return Command::FAILURE;
        }

        $this->info('==========================================================');
        $this->info('🚀 Starting Clean Product Catalog Import from CSV');
        $this->info("File: {$filePath}");
        $this->info('==========================================================');

        // 1. Wipe existing products and dependent table data cleanly
        $this->info('🧹 Step 1: Removing all existing products and images...');
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('order_items')->update(['product_id' => null]);
        DB::table('flash_sale_items')->truncate();
        DB::table('product_images')->truncate();
        DB::table('reviews')->truncate();
        DB::table('products')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        $this->info('✅ Previous products wiped.');

        // 2. Ensure Categories exist with hierarchy
        $this->info('📂 Step 2: Ensuring category hierarchy exists...');
        $categoriesMap = $this->ensureCategories();
        $this->info('✅ Categories ready. Total registered: '.count($categoriesMap));

        // 3. Ensure Brands exist
        $this->info('🏷️ Step 3: Ensuring brands exist...');
        $brandsMap = $this->ensureBrands();
        $this->info('✅ Brands ready: '.implode(', ', array_keys($brandsMap)));

        // 4. Cache Merchants
        $merchantsMap = Merchant::all()->keyBy('id');

        // 5. Read CSV and import
        $this->info('📦 Step 4: Parsing and importing products from CSV...');
        $handle = fopen($filePath, 'r');
        if (! $handle) {
            $this->error("Failed to open CSV file: {$filePath}");

            return Command::FAILURE;
        }

        // Check and skip BOM if present
        $bom = fread($handle, 3);
        if ($bom !== chr(0xEF).chr(0xBB).chr(0xBF)) {
            rewind($handle);
        }

        $headers = fgetcsv($handle, 0, ',', '"', '\\');
        if (! $headers) {
            $this->error('Empty CSV file headers.');
            fclose($handle);

            return Command::FAILURE;
        }

        $headerMap = [];
        foreach ($headers as $idx => $h) {
            $headerMap[trim($h)] = $idx;
        }

        $imported = 0;
        $allSlugs = [];
        $slugLookup = [];
        $createdProducts = [];

        $this->info('Parsing rows...');
        DB::beginTransaction();
        try {
            $rowNum = 0;
            while (($row = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
                $rowNum++;
                if (empty(array_filter($row, fn ($v) => trim($v) !== ''))) {
                    continue;
                }

                $title = trim($row[$headerMap['Title'] ?? -1] ?? '');
                if (empty($title)) {
                    continue;
                }

                $wooId = trim($row[$headerMap['ID'] ?? -1] ?? '');
                $rawSlug = trim($row[$headerMap['Slug'] ?? -1] ?? '');
                $slug = $rawSlug ?: Str::slug($title);

                // Ensure unique slug
                if (isset($slugLookup[$slug])) {
                    $slug = $slug.'-'.($wooId ?: Str::random(4));
                }
                $slugLookup[$slug] = true;
                $allSlugs[] = $slug;

                $rawSku = trim($row[$headerMap['Sku'] ?? -1] ?? '');
                $sku = $rawSku ?: ($wooId ? 'THY-'.$wooId : 'THY-'.strtoupper(Str::random(6)));

                $regPriceRaw = $row[$headerMap['Regular Price'] ?? -1] ?? '';
                $priceRaw = $row[$headerMap['Price'] ?? -1] ?? '';
                $salePriceRaw = $row[$headerMap['Sale Price'] ?? -1] ?? '';

                $regularPrice = (float) preg_replace('/[^0-9.]/', '', $regPriceRaw);
                if ($regularPrice <= 0) {
                    $regularPrice = (float) preg_replace('/[^0-9.]/', '', $priceRaw);
                }

                $salePrice = (float) preg_replace('/[^0-9.]/', '', $salePriceRaw);
                if ($salePrice <= 0 || $salePrice >= $regularPrice) {
                    $salePrice = null;
                }

                $stockStatus = strtolower(trim($row[$headerMap['Stock Status'] ?? -1] ?? 'instock'));
                $stockRaw = trim($row[$headerMap['Stock'] ?? -1] ?? '');
                if ($stockStatus === 'outofstock') {
                    $stockQuantity = 0;
                } elseif ($stockRaw !== '' && is_numeric($stockRaw)) {
                    $stockQuantity = (int) $stockRaw;
                } else {
                    $stockQuantity = 50;
                }

                // Short Description & Content cleaning
                $rawShortDesc = $row[$headerMap['Short Description'] ?? -1] ?? '';
                $shortDesc = $this->cleanDescription($rawShortDesc);
                $description = $row[$headerMap['Content'] ?? -1] ?? $shortDesc;

                // Category Resolution
                $catCol = trim($row[$headerMap['Product categories'] ?? -1] ?? '');
                $categoryId = $this->resolveCategoryId($catCol, $categoriesMap);

                // Brand Resolution
                $brandCol = trim($row[$headerMap['Brands'] ?? -1] ?? '');
                $brandId = ! empty($brandCol) ? ($brandsMap[strtolower($brandCol)] ?? null) : null;

                // Merchant Assignment (heuristic based on categories and brands)
                $merchantId = $this->resolveMerchantId($categoryId, $brandCol);

                // Ratings & Reviews
                $avgRatingRaw = (float) ($row[$headerMap['Wc Average Rating'] ?? -1] ?? 0);
                $reviewCountRaw = (int) ($row[$headerMap['Wc Review Count'] ?? -1] ?? 0);
                $ratingAvg = $avgRatingRaw > 0 ? round($avgRatingRaw, 2) : round(4.5 + (crc32($title) % 5) / 10, 2);
                $reviewsCount = $reviewCountRaw > 0 ? $reviewCountRaw : (crc32($sku) % 28 + 2);

                $isFeatured = strtolower(trim($row[$headerMap['Featured'] ?? -1] ?? 'no')) === 'yes';
                $status = strtolower(trim($row[$headerMap['Status'] ?? -1] ?? 'publish'));
                $isActive = $status === 'publish';

                $productId = DB::table('products')->insertGetId([
                    'category_id' => $categoryId,
                    'brand_id' => $brandId,
                    'merchant_id' => $merchantId,
                    'name' => html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    'slug' => $slug,
                    'sku' => $sku,
                    'short_description' => $shortDesc,
                    'description' => $description,
                    'regular_price' => $regularPrice,
                    'sale_price' => $salePrice,
                    'stock_quantity' => $stockQuantity,
                    'low_stock_threshold' => 5,
                    'rating_avg' => $ratingAvg,
                    'reviews_count' => $reviewsCount,
                    'is_featured' => $isFeatured,
                    'is_active' => $isActive,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Collect images
                $images = [];
                $featuredImg = trim($row[$headerMap['Image Featured'] ?? -1] ?? '');
                if ($featuredImg) {
                    $images[] = $this->normalizeImageUrl($featuredImg);
                }

                $galleryImgs = trim($row[$headerMap['Image URL'] ?? -1] ?? '');
                if ($galleryImgs) {
                    $parts = explode('|', $galleryImgs);
                    foreach ($parts as $url) {
                        $normalized = $this->normalizeImageUrl(trim($url));
                        if ($normalized && ! in_array($normalized, $images, true)) {
                            $images[] = $normalized;
                        }
                    }
                }

                // Insert Product Images
                if (! empty($images)) {
                    $imgRecords = [];
                    foreach ($images as $order => $imgUrl) {
                        $imgRecords[] = [
                            'product_id' => $productId,
                            'image_url' => $imgUrl,
                            'is_primary' => $order === 0,
                            'sort_order' => $order,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                    DB::table('product_images')->insert($imgRecords);
                }

                $createdProducts[] = [
                    'id' => $productId,
                    'name' => $title,
                    'regular_price' => $regularPrice,
                    'sale_price' => $salePrice,
                ];

                $imported++;
            }

            fclose($handle);
            DB::commit();
            $this->info("🎉 Successfully imported {$imported} products into MySQL!");

        } catch (\Throwable $e) {
            fclose($handle);
            DB::rollBack();
            $this->error('Error importing products: '.$e->getMessage());
            $this->line('<fg=red>ERROR: '.$e->getMessage().' in '.$e->getFile().':'.$e->getLine().'</>');

            return Command::FAILURE;
        }

        // 6. Populate ⚡ Flash Sale with 12 real discounted items
        $this->info('⚡ Step 5: Setting up 24H Flash Deals campaign with imported catalog...');
        $this->setupFlashSale($createdProducts);

        // 7. Update resources/frontend/src/data/product-slugs.json
        $this->info('📄 Step 6: Updating product-slugs.json for Next.js SSG...');
        $slugsFile = resource_path('frontend/src/data/product-slugs.json');
        if (file_exists($slugsFile) || is_dir(dirname($slugsFile))) {
            $finalSlugs = array_merge(['[slug]'], $allSlugs);
            file_put_contents($slugsFile, json_encode($finalSlugs, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            $this->info('✅ Wrote '.count($finalSlugs).' slugs to resources/frontend/src/data/product-slugs.json');
        }

        $this->info('==========================================================');
        $this->info('✨ CATALOG IMPORT COMPLETED SUCCESSFULLY!');
        $this->info('Total Products in Store: '.Product::count());
        $this->info('Total Product Images: '.ProductImage::count());
        $this->info('Total Categories: '.Category::count());
        $this->info('==========================================================');

        return Command::SUCCESS;
    }

    private function cleanDescription(?string $text): ?string
    {
        if (empty($text)) {
            return null;
        }

        // Strip ChatGPT container UI classes / elements
        if (str_contains($text, 'qMYqUG') || str_contains($text, 'data-turn-id')) {
            if (preg_match_all('/<p[^>]*>(.*?)<\/p>/is', $text, $matches)) {
                return implode(' ', array_map('trim', $matches[1]));
            }

            return trim(strip_tags($text));
        }

        return trim($text);
    }

    private function normalizeImageUrl(string $url): string
    {
        $url = trim($url);
        if (empty($url)) {
            return '';
        }

        $clean = preg_replace('/[?#].*$/', '', $url);
        $lastSlash = strrpos($clean, '/');
        if ($lastSlash === false) {
            return '';
        }

        $filename = rawurldecode(substr($clean, $lastSlash + 1));
        if (empty($filename)) {
            return '';
        }

        return '/uploads/'.$filename;
    }

    private function ensureCategories(): array
    {
        $definitions = [
            // Top-level categories
            'toys' => ['name' => 'Toys', 'parent' => null, 'featured' => true],
            'home' => ['name' => 'Home', 'parent' => null, 'featured' => true],
            'electronics' => ['name' => 'Electronics', 'parent' => null, 'featured' => true],
            'beauty' => ['name' => 'Beauty', 'parent' => null, 'featured' => true],
            'fashion' => ['name' => 'Fashion', 'parent' => null, 'featured' => true],
            'food' => ['name' => 'Food', 'parent' => null, 'featured' => true],
            'gaming' => ['name' => 'Gaming', 'parent' => null, 'featured' => true],
            'gifts' => ['name' => 'Gift & Hampers', 'parent' => null, 'featured' => true],
            'sports-nutrition' => ['name' => 'Sports Nutrition', 'parent' => null, 'featured' => false],
            'wellness' => ['name' => 'Wellness', 'parent' => null, 'featured' => false],
            'playstation' => ['name' => 'PlayStation', 'parent' => 'gaming', 'featured' => true],
            'nintendo' => ['name' => 'Nintendo', 'parent' => 'gaming', 'featured' => true],

            // Subcategories
            'kitchen' => ['name' => 'Kitchen', 'parent' => 'home'],
            'living' => ['name' => 'Living', 'parent' => 'home'],
            'appliances' => ['name' => 'Appliances', 'parent' => 'electronics'],
            'accessories-electronics' => ['name' => 'Accessories', 'parent' => 'electronics'],
            'personalcare' => ['name' => 'Personal Care', 'parent' => 'beauty'],
            'perfumes' => ['name' => 'Perfumes', 'parent' => 'beauty'],
            'footwear' => ['name' => 'Footwear', 'parent' => 'fashion'],
            'lifestyle' => ['name' => 'Lifestyle', 'parent' => 'fashion'],
            'books' => ['name' => 'Books', 'parent' => 'toys'],
            'entertainment' => ['name' => 'Entertainment', 'parent' => 'toys'],
            'beverages' => ['name' => 'Beverages', 'parent' => 'food'],
            'confectionery' => ['name' => 'Confectionery', 'parent' => 'food'],
            'hamper' => ['name' => 'Hamper', 'parent' => 'gifts'],
            'ps4-games' => ['name' => 'PS 4 Games', 'parent' => 'playstation'],
            'ps5-games' => ['name' => 'PS 5 Games', 'parent' => 'playstation'],
            'sports-supplements' => ['name' => 'Sports Supplements', 'parent' => 'sports-nutrition'],
        ];

        $categoryModels = [];

        // First pass: Parents
        foreach ($definitions as $slug => $def) {
            if ($def['parent'] === null) {
                $cat = Category::updateOrCreate(
                    ['slug' => $slug],
                    [
                        'name' => $def['name'],
                        'parent_id' => null,
                        'is_featured' => $def['featured'] ?? false,
                        'is_active' => true,
                    ]
                );
                $categoryModels[$slug] = $cat;
            }
        }

        // Second pass: Children
        foreach ($definitions as $slug => $def) {
            if ($def['parent'] !== null) {
                $parentId = isset($categoryModels[$def['parent']]) ? $categoryModels[$def['parent']]->id : null;
                $cat = Category::updateOrCreate(
                    ['slug' => $slug],
                    [
                        'name' => $def['name'],
                        'parent_id' => $parentId,
                        'is_featured' => $def['featured'] ?? false,
                        'is_active' => true,
                    ]
                );
                $categoryModels[$slug] = $cat;
            }
        }

        // Create normalized lookup map: ('parent>child' => id) and ('name' => id)
        $lookup = [];
        foreach ($categoryModels as $slug => $model) {
            $lookup[strtolower($model->name)] = $model->id;
            $lookup[$slug] = $model->id;
        }

        // Subcategory aliases
        $lookup['gift'] = $categoryModels['gifts']->id;
        $lookup['gifts'] = $categoryModels['gifts']->id;
        $lookup['gift>hamper'] = $categoryModels['hamper']->id;
        $lookup['gifts>hamper'] = $categoryModels['hamper']->id;
        $lookup['home>kitchen'] = $categoryModels['kitchen']->id;
        $lookup['home>living'] = $categoryModels['living']->id;
        $lookup['electronics>appliances'] = $categoryModels['appliances']->id;
        $lookup['electronics>accessories'] = $categoryModels['accessories-electronics']->id;
        $lookup['beauty>personal care'] = $categoryModels['personalcare']->id;
        $lookup['beauty>perfumes'] = $categoryModels['perfumes']->id;
        $lookup['fashion>footwear'] = $categoryModels['footwear']->id;
        $lookup['fashion>lifestyle'] = $categoryModels['lifestyle']->id;
        $lookup['toys>entertainment'] = $categoryModels['entertainment']->id;
        $lookup['food>beverages'] = $categoryModels['beverages']->id;
        $lookup['food>confectionery'] = $categoryModels['confectionery']->id;
        $lookup['playstation>ps 4 games'] = $categoryModels['ps4-games']->id;
        $lookup['playstation>ps 5 games'] = $categoryModels['ps5-games']->id;
        $lookup['sports nutrition>sports supplements'] = $categoryModels['sports-supplements']->id;
        $lookup['gift>hamper'] = $categoryModels['hamper']->id;

        return $lookup;
    }

    private function resolveCategoryId(string $catCol, array $categoriesMap): ?int
    {
        if (empty($catCol)) {
            return $categoriesMap['home'] ?? 2;
        }

        // Split by | and take the first primary path
        $paths = explode('|', $catCol);
        $primaryPath = strtolower(trim($paths[0]));

        if (isset($categoriesMap[$primaryPath])) {
            return $categoriesMap[$primaryPath];
        }

        // Check child name directly (e.g. if path is "Beauty>Personal Care", check "personal care")
        if (str_contains($primaryPath, '>')) {
            $parts = explode('>', $primaryPath);
            $parent = trim($parts[0]);
            $child = trim($parts[1]);

            if (isset($categoriesMap[$child])) {
                return $categoriesMap[$child];
            }
            if (isset($categoriesMap[$parent])) {
                return $categoriesMap[$parent];
            }
        }

        return $categoriesMap[$primaryPath] ?? ($categoriesMap['home'] ?? 2);
    }

    private function ensureBrands(): array
    {
        $brands = [
            'Apple' => 'apple',
            'Samsung' => 'samsung',
            'Google' => 'google',
            'Philips' => 'philips',
            'Nike' => 'nike',
            'Cadbury' => 'cadbury',
            'JOYROOM' => 'joyroom',
            'BAVIN' => 'bavin',
            'Porodo' => 'porodo',
            'Buldak' => 'buldak',
            'Abans' => 'abans',
            'suriyas' => 'suriyas',
            'Surya ProShield' => 'surya-proshield',
        ];

        $map = [];
        foreach ($brands as $name => $slug) {
            $b = Brand::updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'is_featured' => true]
            );
            $map[strtolower($name)] = $b->id;
            $map[$slug] = $b->id;
        }

        return $map;
    }

    private function resolveMerchantId(?int $categoryId, ?string $brand): ?int
    {
        // 1: Spa Ceylon, 2: Odel, 3: Dilmah, 4: Singer, 5: Keells, 6: Damro, 7: Bake House, 8: Stone & String
        if ($categoryId === 11 || $categoryId === 12) { // Personal Care / Perfumes
            return 1; // Spa Ceylon
        }
        if ($categoryId === 13 || $categoryId === 14) { // Footwear / Lifestyle
            return 2; // Odel
        }
        if ($categoryId === 17) { // Beverages
            return 3; // Dilmah
        }
        if ($categoryId === 9 || $categoryId === 10) { // Appliances / Accessories
            return 4; // Singer
        }
        if ($categoryId === 18) { // Confectionery
            return 7; // Bake House
        }
        if ($categoryId === 7 || $categoryId === 8) { // Kitchen / Living
            return 6; // Damro
        }

        return null;
    }

    private function setupFlashSale(array $products): void
    {
        $flashSale = FlashSale::updateOrCreate(
            ['title' => '⚡ Mega 24H Flash Deals'],
            [
                'banner_url' => '/banners/hero_slide_1.jpg',
                'start_time' => now()->subHours(2),
                'end_time' => now()->addHours(22),
                'is_active' => true,
            ]
        );

        // Pick 12 items that have regular_price >= 500
        $eligible = array_filter($products, fn ($p) => $p['regular_price'] >= 500);
        if (count($eligible) < 12) {
            $eligible = $products;
        }
        shuffle($eligible);
        $selected = array_slice($eligible, 0, 12);

        FlashSaleItem::where('flash_sale_id', $flashSale->id)->delete();

        $sort = 0;
        foreach ($selected as $item) {
            $discountPercent = rand(25, 45);
            $flashPrice = round($item['regular_price'] * (1 - ($discountPercent / 100)));
            $qtyLimit = rand(15, 30);
            $qtySold = rand(5, $qtyLimit - 2);

            FlashSaleItem::create([
                'flash_sale_id' => $flashSale->id,
                'product_id' => $item['id'],
                'flash_price' => $flashPrice,
                'quantity_limit' => $qtyLimit,
                'quantity_sold' => $qtySold,
                'sort_order' => $sort++,
            ]);
        }
        $this->info('⚡ Flash Sale populated with '.count($selected).' items.');
    }
}
