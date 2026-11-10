<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'images', 'merchant']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($categoryId = $request->query('category_id')) {
            $category = Category::find($categoryId);
            $query->whereIn('category_id', $category ? $category->selfAndDescendantIds() : [(int) $categoryId]);
        }

        if ($merchantId = $request->query('merchant_id')) {
            $query->where('merchant_id', $merchantId);
        }

        if ($request->query('stock_status') === 'low') {
            $query->where('stock_quantity', '<=', 5);
        }

        $products = $query->latest()->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $products->items(),
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'merchant_id' => 'nullable|exists:merchants,id',
            'regular_price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'sku' => 'nullable|string|max:50',
            'short_description' => 'nullable|string',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string|max:500',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $slug = Str::slug($validated['name']).'-'.Str::random(5);
        $sku = ! empty($validated['sku']) ? $validated['sku'] : 'THY-'.strtoupper(Str::random(6));

        $product = Product::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'category_id' => $validated['category_id'] ?? null,
            'merchant_id' => $validated['merchant_id'] ?? null,
            'sku' => $sku,
            'regular_price' => $validated['regular_price'],
            'sale_price' => $validated['sale_price'] ?? null,
            'stock_quantity' => $validated['stock_quantity'],
            'short_description' => $validated['short_description'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_featured' => $validated['is_featured'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        if (! empty($validated['image_url'])) {
            ProductImage::create([
                'product_id' => $product->id,
                'image_url' => $validated['image_url'],
                'is_primary' => true,
                'sort_order' => 0,
            ]);
        }

        ActivityLog::record(
            'CREATE_PRODUCT',
            "Created product '{$product->name}' (SKU: {$product->sku}, Price: Rs. {$product->regular_price})",
            'Product',
            $product->id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'Product created successfully',
            'data' => $product->load('images', 'category', 'merchant'),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'merchant_id' => 'nullable|exists:merchants,id',
            'regular_price' => 'sometimes|required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|required|integer|min:0',
            'sku' => 'nullable|string|max:50',
            'short_description' => 'nullable|string',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string|max:500',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $product->update($validated);

        if (! empty($validated['image_url'])) {
            $primaryImg = $product->images()->where('is_primary', true)->first();
            if ($primaryImg) {
                $primaryImg->update(['image_url' => $validated['image_url']]);
            } else {
                ProductImage::create([
                    'product_id' => $product->id,
                    'image_url' => $validated['image_url'],
                    'is_primary' => true,
                ]);
            }
        }

        ActivityLog::record(
            'UPDATE_PRODUCT',
            "Updated product '{$product->name}' specifications and pricing",
            'Product',
            $product->id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully',
            'data' => $product->load('images', 'category'),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $productName = $product->name;
        $product->delete();

        ActivityLog::record(
            'DELETE_PRODUCT',
            "Deleted product '{$productName}'",
            'Product',
            $id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'Product removed successfully',
        ]);
    }

    public function export(Request $request)
    {
        $query = Product::with(['category', 'images', 'merchant']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($categoryId = $request->query('category_id')) {
            $category = Category::find($categoryId);
            $query->whereIn('category_id', $category ? $category->selfAndDescendantIds() : [(int) $categoryId]);
        }

        if ($merchantId = $request->query('merchant_id')) {
            $query->where('merchant_id', $merchantId);
        }

        $products = $query->latest()->get();
        $filename = 'thyaga_products_'.date('Y-m-d').'.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($products) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM

            fputcsv($file, [
                'ID',
                'Name',
                'SKU',
                'Category',
                'Merchant',
                'Regular Price',
                'Sale Price',
                'Stock Quantity',
                'Short Description',
                'Description',
                'Image URL',
                'Is Featured',
                'Is Active',
            ]);

            foreach ($products as $p) {
                $primaryImg = $p->images->firstWhere('is_primary', true) ?? $p->images->first();
                $imageUrl = $primaryImg ? $primaryImg->image_url : '';

                fputcsv($file, [
                    $p->id,
                    $p->name,
                    $p->sku,
                    $p->category ? $p->category->name : '',
                    $p->merchant ? $p->merchant->name : '',
                    $p->regular_price,
                    $p->sale_price ?? '',
                    $p->stock_quantity,
                    $p->short_description ?? '',
                    $p->description ?? '',
                    $imageUrl,
                    $p->is_featured ? '1' : '0',
                    $p->is_active ? '1' : '0',
                ]);
            }

            fclose($file);
        };

        ActivityLog::record(
            'EXPORT_PRODUCTS',
            "Exported {$products->count()} products to CSV",
            'Product',
            null,
            $request->user(),
            $request
        );

        return response()->stream($callback, 200, $headers);
    }

    public function sampleTemplate()
    {
        $filename = 'thyaga_products_sample_template.csv';
        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($file, [
                'Name',
                'SKU',
                'Category',
                'Merchant',
                'Regular Price',
                'Sale Price',
                'Stock Quantity',
                'Short Description',
                'Description',
                'Image URL',
                'Is Featured',
                'Is Active',
            ]);

            fputcsv($file, [
                'Premium Wireless Bluetooth Earbuds',
                'THY-EAR-001',
                'Electronics',
                '',
                '4500.00',
                '3990.00',
                '100',
                'Crystal-clear audio with deep bass and ENC noise cancellation',
                'Experience superior sound with 30-hour battery life and fast charging.',
                'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800',
                '1',
                '1',
            ]);

            fputcsv($file, [
                'Pure Ceylon Organic Green Tea 100g',
                'THY-TEA-002',
                'Food',
                '',
                '1200.00',
                '',
                '75',
                'Single-origin high-grown Ceylon green tea leaves',
                'Handpicked from Nuwara Eliya estates. Rich in natural antioxidants.',
                'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800',
                '0',
                '1',
            ]);

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function import(Request $request): JsonResponse
    {
        $rows = [];
        $updateExisting = filter_var($request->input('update_existing', false), FILTER_VALIDATE_BOOLEAN);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->getRealPath();

            if (($handle = fopen($path, 'r')) !== false) {
                // Check and skip BOM if present
                $bom = fread($handle, 3);
                if ($bom !== chr(0xEF).chr(0xBB).chr(0xBF)) {
                    rewind($handle);
                }

                $header = fgetcsv($handle);
                if (! $header) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Empty CSV file provided',
                    ], 422);
                }

                $cleanHeaders = array_map(function ($h) {
                    $cleaned = strtolower(trim($h));
                    $cleaned = preg_replace('/[^a-z0-9_]/', '_', $cleaned);

                    return trim(preg_replace('/_+/', '_', $cleaned), '_');
                }, $header);

                while (($data = fgetcsv($handle)) !== false) {
                    if (empty(array_filter($data, fn ($v) => trim($v) !== ''))) {
                        continue;
                    }
                    $row = [];
                    foreach ($cleanHeaders as $idx => $key) {
                        $row[$key] = $data[$idx] ?? null;
                    }
                    $rows[] = $row;
                }
                fclose($handle);
            }
        } elseif ($request->has('products') && is_array($request->input('products'))) {
            $rows = $request->input('products');
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a valid CSV file or products payload',
            ], 422);
        }

        if (empty($rows)) {
            return response()->json([
                'success' => false,
                'message' => 'No product rows detected in file',
            ], 422);
        }

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        $categoriesMap = Category::all()->keyBy(fn ($c) => strtolower($c->name));
        $merchantsMap = Merchant::all()->keyBy(fn ($m) => strtolower($m->name));
        $defaultCategory = Category::first();

        DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                $rowNum = $index + 2;

                $name = $row['name'] ?? $row['product_name'] ?? $row['title'] ?? null;
                if (empty($name)) {
                    $errors[] = "Row {$rowNum}: Missing product name";
                    $skipped++;

                    continue;
                }

                $sku = ! empty($row['sku']) ? trim($row['sku']) : null;
                $regularPrice = isset($row['regular_price']) ? floatval(preg_replace('/[^0-9.]/', '', $row['regular_price'])) : null;
                if ($regularPrice === null || $regularPrice <= 0) {
                    $regularPrice = isset($row['price']) ? floatval(preg_replace('/[^0-9.]/', '', $row['price'])) : null;
                }
                if ($regularPrice === null || $regularPrice <= 0) {
                    $errors[] = "Row {$rowNum} ('{$name}'): Invalid regular price";
                    $skipped++;

                    continue;
                }

                $salePrice = ! empty($row['sale_price']) ? floatval(preg_replace('/[^0-9.]/', '', $row['sale_price'])) : null;
                $stockQuantity = isset($row['stock_quantity']) ? intval(preg_replace('/[^0-9]/', '', $row['stock_quantity'])) : 50;

                // Category lookup
                $categoryId = null;
                $catVal = $row['category'] ?? $row['category_id'] ?? $row['category_name'] ?? null;
                if ($catVal) {
                    if (is_numeric($catVal) && Category::find($catVal)) {
                        $categoryId = intval($catVal);
                    } else {
                        $normCat = strtolower(trim($catVal));
                        if (isset($categoriesMap[$normCat])) {
                            $categoryId = $categoriesMap[$normCat]->id;
                        } else {
                            $newCat = Category::create([
                                'name' => trim($catVal),
                                'slug' => Str::slug($catVal),
                                'is_active' => true,
                            ]);
                            $categoriesMap[$normCat] = $newCat;
                            $categoryId = $newCat->id;
                        }
                    }
                }
                if (! $categoryId && $defaultCategory) {
                    $categoryId = $defaultCategory->id;
                }

                // Merchant lookup
                $merchantId = null;
                $merchVal = $row['merchant'] ?? $row['merchant_id'] ?? $row['merchant_name'] ?? null;
                if ($merchVal) {
                    if (is_numeric($merchVal) && Merchant::find($merchVal)) {
                        $merchantId = intval($merchVal);
                    } else {
                        $normMerch = strtolower(trim($merchVal));
                        if (isset($merchantsMap[$normMerch])) {
                            $merchantId = $merchantsMap[$normMerch]->id;
                        }
                    }
                }

                $shortDesc = $row['short_description'] ?? null;
                $description = $row['description'] ?? null;
                $imageUrl = $row['image_url'] ?? $row['image'] ?? null;
                $isFeatured = ! empty($row['is_featured']) && in_array(strval($row['is_featured']), ['1', 'true', 'yes'], true);
                $isActive = ! isset($row['is_active']) || in_array(strval($row['is_active']), ['1', 'true', 'yes'], true);

                $existingProduct = null;
                if ($sku) {
                    $existingProduct = Product::where('sku', $sku)->first();
                }

                if ($existingProduct) {
                    if ($updateExisting) {
                        $existingProduct->update([
                            'name' => $name,
                            'category_id' => $categoryId,
                            'merchant_id' => $merchantId ?? $existingProduct->merchant_id,
                            'regular_price' => $regularPrice,
                            'sale_price' => $salePrice,
                            'stock_quantity' => $stockQuantity,
                            'short_description' => $shortDesc ?? $existingProduct->short_description,
                            'description' => $description ?? $existingProduct->description,
                            'is_featured' => $isFeatured,
                            'is_active' => $isActive,
                        ]);

                        if (! empty($imageUrl)) {
                            $primary = $existingProduct->images()->where('is_primary', true)->first();
                            if ($primary) {
                                $primary->update(['image_url' => $imageUrl]);
                            } else {
                                ProductImage::create([
                                    'product_id' => $existingProduct->id,
                                    'image_url' => $imageUrl,
                                    'is_primary' => true,
                                ]);
                            }
                        }
                        $updated++;
                    } else {
                        $skipped++;
                    }
                } else {
                    $finalSku = $sku ?: 'THY-'.strtoupper(Str::random(6));
                    $slug = Str::slug($name).'-'.Str::random(5);

                    $product = Product::create([
                        'name' => $name,
                        'slug' => $slug,
                        'sku' => $finalSku,
                        'category_id' => $categoryId,
                        'merchant_id' => $merchantId,
                        'regular_price' => $regularPrice,
                        'sale_price' => $salePrice,
                        'stock_quantity' => $stockQuantity,
                        'short_description' => $shortDesc,
                        'description' => $description,
                        'is_featured' => $isFeatured,
                        'is_active' => $isActive,
                    ]);

                    if (! empty($imageUrl)) {
                        ProductImage::create([
                            'product_id' => $product->id,
                            'image_url' => $imageUrl,
                            'is_primary' => true,
                        ]);
                    }
                    $imported++;
                }
            }

            DB::commit();

            ActivityLog::record(
                'IMPORT_PRODUCTS',
                "Imported {$imported} products, updated {$updated}, skipped {$skipped} from CSV",
                'Product',
                null,
                $request->user(),
                $request
            );

            return response()->json([
                'success' => true,
                'message' => "Import completed: {$imported} added, {$updated} updated, {$skipped} skipped.",
                'imported' => $imported,
                'updated' => $updated,
                'skipped' => $skipped,
                'errors' => array_slice($errors, 0, 10),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error during import: '.$e->getMessage(),
            ], 500);
        }
    }

    public function bulkPricing(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => 'required_without:select_all_matching|array',
            'product_ids.*' => 'integer|exists:products,id',
            'select_all_matching' => 'nullable|boolean',
            'filters' => 'nullable|array',
            'filters.search' => 'nullable|string',
            'filters.category_id' => 'nullable|integer',
            'filters.merchant_id' => 'nullable|integer',
            'filters.brand_id' => 'nullable|integer',
            'filters.stock_status' => 'nullable|string',
            'target' => 'required|string|in:discount,regular_price,both',
            // Regular price adjustment
            'regular_action' => 'nullable|string|in:increase_percent,decrease_percent,increase_flat,decrease_flat,set_exact',
            'regular_value' => 'nullable|numeric|min:0',
            // Discount / sale price adjustment
            'discount_action' => 'nullable|string|in:set_percent,set_flat_discount,set_sale_price,clear_discount',
            'discount_value' => 'nullable|numeric|min:0',
            // Rounding:
            'round_to' => 'nullable|string|in:none,1,10,50,100',
            // When regular price changes, what to do with existing sale price:
            'sale_price_handling' => 'nullable|string|in:keep_discount_percent,keep_sale_price,remove_sale_price',
        ]);

        $query = Product::query();

        if (! empty($validated['select_all_matching'])) {
            $filters = $validated['filters'] ?? [];
            if (! empty($filters['search'])) {
                $search = $filters['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                });
            }
            if (! empty($filters['category_id'])) {
                $category = Category::find($filters['category_id']);
                $query->whereIn('category_id', $category ? $category->selfAndDescendantIds() : [(int) $filters['category_id']]);
            }
            if (! empty($filters['merchant_id'])) {
                $query->where('merchant_id', $filters['merchant_id']);
            }
            if (! empty($filters['brand_id'])) {
                $query->where('brand_id', $filters['brand_id']);
            }
            if (($filters['stock_status'] ?? '') === 'low') {
                $query->where('stock_quantity', '<=', 5);
            }
        } else {
            $query->whereIn('id', $validated['product_ids'] ?? []);
        }

        $products = $query->get();

        if ($products->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No products found to update.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $updatedCount = 0;
            $roundTo = $validated['round_to'] ?? 'none';

            foreach ($products as $p) {
                $oldRegular = (float) $p->regular_price;
                $oldSale = $p->sale_price !== null ? (float) $p->sale_price : null;
                $newRegular = $oldRegular;
                $newSale = $oldSale;

                // 1. Regular price adjustment
                if (in_array($validated['target'], ['regular_price', 'both'], true) && ! empty($validated['regular_action'])) {
                    $regVal = (float) ($validated['regular_value'] ?? 0);
                    $newRegular = match ($validated['regular_action']) {
                        'increase_percent' => $oldRegular * (1 + ($regVal / 100)),
                        'decrease_percent' => max(0, $oldRegular * (1 - ($regVal / 100))),
                        'increase_flat' => $oldRegular + $regVal,
                        'decrease_flat' => max(0, $oldRegular - $regVal),
                        'set_exact' => max(0, $regVal),
                        default => $oldRegular,
                    };

                    $newRegular = $this->applyRounding($newRegular, $roundTo);

                    // If not explicitly setting discount action, handle existing discount:
                    if ($validated['target'] === 'regular_price') {
                        $handling = $validated['sale_price_handling'] ?? 'keep_discount_percent';
                        if ($handling === 'remove_sale_price') {
                            $newSale = null;
                        } elseif ($handling === 'keep_discount_percent' && $oldSale !== null && $oldRegular > 0) {
                            $discountRatio = ($oldRegular - $oldSale) / $oldRegular;
                            if ($discountRatio > 0 && $discountRatio < 1) {
                                $newSale = $this->applyRounding(max(0, $newRegular * (1 - $discountRatio)), $roundTo);
                            } else {
                                $newSale = null;
                            }
                        } elseif ($handling === 'keep_sale_price' && $oldSale !== null) {
                            if ($oldSale >= $newRegular) {
                                $newSale = null;
                            }
                        }
                    }
                }

                // 2. Discount / Sale price adjustment
                if (in_array($validated['target'], ['discount', 'both'], true) && ! empty($validated['discount_action'])) {
                    $discVal = (float) ($validated['discount_value'] ?? 0);
                    $newSale = match ($validated['discount_action']) {
                        'set_percent' => max(0, $newRegular * (1 - ($discVal / 100))),
                        'set_flat_discount' => max(0, $newRegular - $discVal),
                        'set_sale_price' => max(0, $discVal),
                        'clear_discount' => null,
                        default => $newSale,
                    };

                    if ($newSale !== null) {
                        $newSale = $this->applyRounding($newSale, $roundTo);
                        if ($newSale >= $newRegular || $newSale <= 0) {
                            $newSale = null;
                        }
                    }
                }

                $p->update([
                    'regular_price' => $newRegular,
                    'sale_price' => $newSale,
                ]);
                $updatedCount++;
            }

            DB::commit();

            ActivityLog::record(
                'BULK_PRICE_ADJUSTMENT',
                "Bulk updated pricing on {$updatedCount} products (Target: {$validated['target']})",
                'Product',
                null,
                $request->user(),
                $request
            );

            return response()->json([
                'success' => true,
                'message' => "Successfully updated pricing for {$updatedCount} products.",
                'updated_count' => $updatedCount,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to apply bulk pricing: '.$e->getMessage(),
            ], 500);
        }
    }

    private function applyRounding(float $val, ?string $roundTo): float
    {
        return match ($roundTo) {
            '1' => round($val),
            '10' => round($val / 10) * 10,
            '50' => round($val / 50) * 50,
            '100' => round($val / 100) * 100,
            default => round($val, 2),
        };
    }
}
