<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::where('is_active', true)->with(['category', 'images']);

        // Search query
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        // Category filter
        if ($categorySlug = $request->query('category')) {
            $category = Category::where('slug', $categorySlug)->first();
            if ($category) {
                $query->whereIn('category_id', $category->selfAndDescendantIds());
            }
        }

        // Price range
        if ($minPrice = $request->query('min_price')) {
            $query->where('regular_price', '>=', (float) $minPrice);
        }
        if ($maxPrice = $request->query('max_price')) {
            $query->where('regular_price', '<=', (float) $maxPrice);
        }

        // Featured only
        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        // Sorting
        $sort = $request->query('sort', 'newest');
        switch ($sort) {
            case 'price_asc':
                $query->orderBy('regular_price', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('regular_price', 'desc');
                break;
            case 'rating':
                $query->orderBy('rating_avg', 'desc');
                break;
            case 'popular':
            case 'best_selling':
                $query->orderBy('reviews_count', 'desc');
                break;
            case 'newest':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        $perPage = min(100, max(1, (int) $request->query('per_page', 24)));
        $products = $query->paginate($perPage);

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

    public function show(string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)
            ->where('is_active', true)
            ->with(['category', 'images', 'flashSaleItems' => function ($q) {
                $q->whereHas('flashSale', function ($sq) {
                    $sq->where('is_active', true)
                        ->where('start_time', '<=', now())
                        ->where('end_time', '>=', now());
                });
            }])
            ->firstOrFail();

        // Related products in same category
        $relatedProducts = Product::where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->where('is_active', true)
            ->with('images')
            ->take(8)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'product' => $product,
                'related' => $relatedProducts,
            ],
        ]);
    }

    public function featured(): JsonResponse
    {
        $featured = Product::where('is_active', true)
            ->where('is_featured', true)
            ->with(['category', 'images'])
            ->take(12)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $featured,
        ]);
    }
}
