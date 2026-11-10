<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\HomeSectionProduct;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Admin → Homepage Sections: choose and order the products in Trending and Best Sellers.
 */
class AdminHomeSectionController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                HomeSectionProduct::TRENDING => $this->products(HomeSectionProduct::TRENDING),
                HomeSectionProduct::BEST_SELLERS => $this->products(HomeSectionProduct::BEST_SELLERS),
            ],
        ]);
    }

    public function store(Request $request, string $section): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => [
                'required',
                'integer',
                Rule::exists('products', 'id')->where('is_active', true),
                Rule::unique('home_section_products', 'product_id')->where('section', $section),
            ],
        ], [
            'product_id.exists' => 'This product is hidden or no longer exists.',
            'product_id.unique' => 'This product is already in the section.',
        ]);

        HomeSectionProduct::create([
            'section' => $section,
            'product_id' => $validated['product_id'],
            'sort_order' => (int) HomeSectionProduct::where('section', $section)->max('sort_order') + 1,
        ]);

        $this->log($request, 'ADD_HOME_SECTION_PRODUCT', "Added product #{$validated['product_id']} to the {$section} section", (int) $validated['product_id']);

        return response()->json([
            'success' => true,
            'message' => 'Product added to the section',
            'data' => $this->products($section),
        ], 201);
    }

    public function destroy(Request $request, string $section, int $productId): JsonResponse
    {
        HomeSectionProduct::where('section', $section)->where('product_id', $productId)->firstOrFail()->delete();

        $this->log($request, 'REMOVE_HOME_SECTION_PRODUCT', "Removed product #{$productId} from the {$section} section", $productId);

        return response()->json([
            'success' => true,
            'message' => 'Product removed from the section',
            'data' => $this->products($section),
        ]);
    }

    /**
     * Save a new display order: { "ids": [3, 1, 2, ...] } listing every product in the section.
     */
    public function reorder(Request $request, string $section): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|distinct',
        ]);

        $currentIds = HomeSectionProduct::where('section', $section)->pluck('product_id')->all();

        if (array_diff($currentIds, $validated['ids']) !== [] || array_diff($validated['ids'], $currentIds) !== []) {
            return response()->json([
                'success' => false,
                'message' => 'This section has changed. Please reload the page and try again.',
            ], 422);
        }

        DB::transaction(function () use ($validated, $section) {
            foreach ($validated['ids'] as $position => $productId) {
                HomeSectionProduct::where('section', $section)->where('product_id', $productId)->update(['sort_order' => $position]);
            }
        });

        $this->log($request, 'REORDER_HOME_SECTION', "Reordered the {$section} section", null);

        return response()->json([
            'success' => true,
            'message' => 'Product order saved',
            'data' => $this->products($section),
        ]);
    }

    /**
     * The section's products in display order, including hidden ones so they can be removed.
     *
     * @return Collection<int, Product>
     */
    private function products(string $section): Collection
    {
        return Product::query()
            ->select('products.*')
            ->join('home_section_products', 'home_section_products.product_id', '=', 'products.id')
            ->where('home_section_products.section', $section)
            ->with(['category', 'images'])
            ->orderBy('home_section_products.sort_order')
            ->get();
    }

    private function log(Request $request, string $action, string $description, ?int $productId): void
    {
        ActivityLog::record($action, $description, 'Product', $productId, $request->user(), $request);
    }
}
