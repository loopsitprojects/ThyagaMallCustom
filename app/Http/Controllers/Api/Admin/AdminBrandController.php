<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminBrandController extends Controller
{
    /**
     * Display a listing of all brands with their product counts.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Brand::withCount('products');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('featured')) {
            $query->where('is_featured', $request->boolean('featured'));
        }

        if ($status = $request->query('status')) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $brands = $query->ordered()->get();

        return response()->json([
            'success' => true,
            'data' => $brands,
            'stats' => [
                'total' => Brand::count(),
                'featured' => Brand::where('is_featured', true)->count(),
                'active' => Brand::where('is_active', true)->count(),
                'inactive' => Brand::where('is_active', false)->count(),
            ],
        ]);
    }

    /**
     * Store a newly created brand in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'nullable|string|max:100|unique:brands,slug',
            'logo' => 'nullable|string|max:500',
            'website_url' => 'nullable|string|max:500',
            'description' => 'nullable|string|max:1000',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $slug = ! empty($validated['slug'])
            ? Str::slug($validated['slug'])
            : $this->generateUniqueSlug($validated['name']);

        $sortOrder = $validated['sort_order'] ?? ((int) Brand::max('sort_order') + 1);

        $brand = Brand::create([
            'name' => trim($validated['name']),
            'slug' => $slug,
            'logo' => $validated['logo'] ?? null,
            'website_url' => $validated['website_url'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_featured' => $validated['is_featured'] ?? true,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $sortOrder,
        ]);

        ActivityLog::record(
            'CREATE_BRAND',
            "Created brand '{$brand->name}' (Slug: {$brand->slug})",
            'Brand',
            $brand->id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => "Brand '{$brand->name}' created successfully",
            'data' => $brand->loadCount('products'),
        ], 201);
    }

    /**
     * Display the specified brand with products.
     */
    public function show(int $id): JsonResponse
    {
        $brand = Brand::withCount('products')->findOrFail($id);

        $products = $brand->products()
            ->with(['category', 'images'])
            ->latest()
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => [
                'brand' => $brand,
                'products' => $products,
            ],
        ]);
    }

    /**
     * Update the specified brand in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $brand = Brand::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'slug' => ['nullable', 'string', 'max:100', Rule::unique('brands', 'slug')->ignore($brand->id)],
            'logo' => 'nullable|string|max:500',
            'website_url' => 'nullable|string|max:500',
            'description' => 'nullable|string|max:1000',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['name']) && empty($validated['slug'])) {
            $validated['slug'] = $this->generateUniqueSlug($validated['name'], $brand->id);
        } elseif (! empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['slug']);
        }

        $brand->update($validated);

        ActivityLog::record(
            'UPDATE_BRAND',
            "Updated brand '{$brand->name}'",
            'Brand',
            $brand->id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => "Brand '{$brand->name}' updated successfully",
            'data' => $brand->fresh()->loadCount('products'),
        ]);
    }

    /**
     * Toggle featured status with 1 click.
     */
    public function toggleFeatured(Request $request, int $id): JsonResponse
    {
        $brand = Brand::findOrFail($id);
        $brand->is_featured = ! $brand->is_featured;
        $brand->save();

        $statusStr = $brand->is_featured ? 'featured on homepage' : 'removed from homepage';
        ActivityLog::record(
            'TOGGLE_BRAND_FEATURED',
            "Brand '{$brand->name}' {$statusStr}",
            'Brand',
            $brand->id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => "Brand '{$brand->name}' is now {$statusStr}",
            'data' => $brand->loadCount('products'),
        ]);
    }

    /**
     * Toggle active status with 1 click.
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $brand = Brand::findOrFail($id);
        $brand->is_active = ! $brand->is_active;
        $brand->save();

        $statusStr = $brand->is_active ? 'active' : 'inactive';
        ActivityLog::record(
            'TOGGLE_BRAND_STATUS',
            "Brand '{$brand->name}' set to {$statusStr}",
            'Brand',
            $brand->id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => "Brand '{$brand->name}' is now {$statusStr}",
            'data' => $brand->loadCount('products'),
        ]);
    }

    /**
     * Remove the specified brand from storage.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $brand = Brand::withCount('products')->findOrFail($id);
        $name = $brand->name;
        $productCount = $brand->products_count;

        DB::transaction(function () use ($brand) {
            // Nullify products brand association so products are never lost
            $brand->products()->update(['brand_id' => null]);
            $brand->delete();
        });

        ActivityLog::record(
            'DELETE_BRAND',
            "Deleted brand '{$name}' (had {$productCount} assigned products)",
            'Brand',
            $id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => "Brand '{$name}' deleted successfully",
        ]);
    }

    /**
     * Batch reorder brands: { "ids": [3, 1, 2] }
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|distinct|exists:brands,id',
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['ids'] as $index => $id) {
                Brand::where('id', $id)->update(['sort_order' => $index + 1]);
            }
        });

        ActivityLog::record(
            'REORDER_BRANDS',
            'Updated brands display order for homepage and storefront',
            'Brand',
            null,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'Brand order updated successfully',
            'data' => Brand::withCount('products')->ordered()->get(),
        ]);
    }

    /**
     * Generate a unique slug for a brand.
     */
    private function generateUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'brand';
        $slug = $base;
        $count = 1;

        while (Brand::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-{$count}";
            $count++;
        }

        return $slug;
    }
}
