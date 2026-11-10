<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\HomeSectionProduct;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomeSectionController extends Controller
{
    /**
     * Products for a homepage section: the admin's picks in their saved order, or
     * the most-reviewed products while the section has no active picks.
     */
    public function show(Request $request, string $section): JsonResponse
    {
        $categoryIds = null;

        if ($slug = $request->query('category')) {
            $categoryIds = Category::where('slug', $slug)->first()?->selfAndDescendantIds() ?? [];
        }

        $isCurated = $this->hasActivePicks($section);

        return response()->json([
            'success' => true,
            'data' => $isCurated ? $this->picks($section, $categoryIds) : $this->mostReviewed($categoryIds),
            'curated' => $isCurated,
        ]);
    }

    private function hasActivePicks(string $section): bool
    {
        try {
            return HomeSectionProduct::where('section', $section)
                ->whereHas('product', fn ($query) => $query->where('is_active', true))
                ->exists();
        } catch (QueryException $e) {
            // The table hasn't been created on this server yet.
            report($e);

            return false;
        }
    }

    /**
     * @param  array<int, int>|null  $categoryIds
     * @return Collection<int, Product>
     */
    private function picks(string $section, ?array $categoryIds): Collection
    {
        return Product::query()
            ->select('products.*')
            ->join('home_section_products', 'home_section_products.product_id', '=', 'products.id')
            ->where('home_section_products.section', $section)
            ->where('products.is_active', true)
            ->when($categoryIds !== null, fn ($query) => $query->whereIn('products.category_id', $categoryIds))
            ->with(['category', 'images'])
            ->orderBy('home_section_products.sort_order')
            ->limit(HomeSectionProduct::DISPLAY_LIMIT)
            ->get();
    }

    /**
     * @param  array<int, int>|null  $categoryIds
     * @return Collection<int, Product>
     */
    private function mostReviewed(?array $categoryIds): Collection
    {
        return Product::where('is_active', true)
            ->when($categoryIds !== null, fn ($query) => $query->whereIn('category_id', $categoryIds))
            ->with(['category', 'images'])
            ->orderByDesc('reviews_count')
            ->limit(HomeSectionProduct::DISPLAY_LIMIT)
            ->get();
    }
}
