<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    /**
     * List active brands for storefront (homepage marquee / brand list).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Brand::active()->withCount(['products' => function ($q) {
            $q->where('is_active', true);
        }]);

        if ($request->boolean('featured')) {
            $query->featured();
        }

        $brands = $query->ordered()->get();

        return response()->json([
            'success' => true,
            'data' => $brands,
        ]);
    }

    /**
     * Show a brand and its active products.
     */
    public function show(string $slug): JsonResponse
    {
        $brand = Brand::where('slug', $slug)
            ->where('is_active', true)
            ->withCount(['products' => function ($q) {
                $q->where('is_active', true);
            }])
            ->firstOrFail();

        $products = $brand->products()
            ->where('is_active', true)
            ->with(['category', 'images'])
            ->latest()
            ->paginate(24);

        return response()->json([
            'success' => true,
            'data' => [
                'brand' => $brand,
                'products' => $products,
            ],
        ]);
    }
}
