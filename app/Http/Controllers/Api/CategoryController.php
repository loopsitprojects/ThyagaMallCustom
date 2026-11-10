<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

class CategoryController extends Controller
{
    /**
     * Active category tree (any depth), ordered for display.
     * Each node carries its own `products_count` and a `total_products_count`
     * that includes all of its sub-categories.
     */
    public function index(): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $this->buildTree($categories->groupBy(fn (Category $c) => $c->parent_id ?? 0), 0),
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $category = Category::where('slug', $slug)
            ->with(['children', 'products' => function ($q) {
                $q->where('is_active', true)->with('images');
            }])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $category,
        ]);
    }

    /**
     * @param  Collection<int, Collection<int, Category>>  $byParent
     * @return array<int, array<string, mixed>>
     */
    private function buildTree(Collection $byParent, int $parentId): array
    {
        return $byParent->get($parentId, collect())->map(function (Category $category) use ($byParent) {
            $children = $this->buildTree($byParent, $category->id);

            return array_merge($category->toArray(), [
                'children' => $children,
                'total_products_count' => $category->products_count
                    + array_sum(array_column($children, 'total_products_count')),
            ]);
        })->values()->all();
    }
}
