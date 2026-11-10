<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminCategoryController extends Controller
{
    private const HEX = 'regex:/^#[0-9a-fA-F]{6}$/';

    // https URL or a site-relative path — never javascript:, data:, etc.
    private const IMAGE = 'regex:/^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/';

    /**
     * Every category (including inactive ones) as a flat list; the admin UI builds the tree.
     */
    public function index(): JsonResponse
    {
        $categories = Category::withCount(['products', 'children'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
            'icons' => config('categories.icons'),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $validated['slug'] = $this->uniqueSlug($validated['slug'] ?? $validated['name']);
        $validated['sort_order'] ??= (int) Category::where('parent_id', $validated['parent_id'] ?? null)->max('sort_order') + 1;

        $category = Category::create($validated);

        ActivityLog::record('CREATE_CATEGORY', "Created category '{$category->name}'".($category->parent ? " under '{$category->parent->name}'" : ''), 'Category', $category->id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => "Category '{$category->name}' created",
            'data' => $category->loadCount(['products', 'children']),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $validated = $request->validate($this->rules($category));

        if (array_key_exists('parent_id', $validated) && $validated['parent_id'] !== null
            && in_array((int) $validated['parent_id'], $category->selfAndDescendantIds(), true)) {
            throw ValidationException::withMessages([
                'parent_id' => ['A category cannot be moved inside itself or one of its own sub-categories.'],
            ]);
        }

        if (array_key_exists('slug', $validated)) {
            $validated['slug'] = $this->uniqueSlug($validated['slug'] ?: ($validated['name'] ?? $category->name), $category->id);
        }

        $category->update($validated);

        ActivityLog::record('UPDATE_CATEGORY', "Updated category '{$category->name}'", 'Category', $category->id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => "Category '{$category->name}' updated",
            'data' => $category->loadCount(['products', 'children']),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $category = Category::withCount(['products', 'children'])->findOrFail($id);

        if ($category->children_count > 0) {
            throw ValidationException::withMessages([
                'category' => ["'{$category->name}' still has {$category->children_count} ".Str::plural('sub-category', $category->children_count).'. Move or delete them first.'],
            ]);
        }

        if ($category->products_count > 0) {
            throw ValidationException::withMessages([
                'category' => ["{$category->products_count} ".Str::plural('product', $category->products_count)." in '{$category->name}'. Move ".($category->products_count === 1 ? 'it' : 'them').' to another category first, or hide this category instead.'],
            ]);
        }

        $name = $category->name;
        $category->delete();

        ActivityLog::record('DELETE_CATEGORY', "Deleted category '{$name}'", 'Category', $id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => "Category '{$name}' deleted",
        ]);
    }

    /**
     * Save the display order of sibling categories: { "ids": [5, 2, 9] }.
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|distinct|exists:categories,id',
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['ids'] as $position => $id) {
                Category::whereKey($id)->update(['sort_order' => $position + 1]);
            }
        });

        ActivityLog::record('REORDER_CATEGORIES', 'Reordered categories', 'Category', null, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => 'Category order saved',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(?Category $category = null): array
    {
        $required = $category ? 'sometimes|required' : 'required';

        return [
            'name' => "{$required}|string|max:100",
            'slug' => ['sometimes', 'nullable', 'string', 'max:120', 'alpha_dash'],
            'parent_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id'],
            'subtitle' => 'sometimes|nullable|string|max:80',
            'description' => 'sometimes|nullable|string|max:1000',
            'icon' => ['sometimes', 'nullable', Rule::in(config('categories.icons'))],
            'color_from' => ['sometimes', 'nullable', self::HEX],
            'color_to' => ['sometimes', 'nullable', self::HEX],
            'image' => ['sometimes', 'nullable', 'string', 'max:500', self::IMAGE],
            'sort_order' => 'sometimes|nullable|integer|min:0',
            'is_active' => 'sometimes|boolean',
            'is_featured' => 'sometimes|boolean',
            'show_in_menu' => 'sometimes|boolean',
        ];
    }

    private function uniqueSlug(string $source, ?int $ignoreId = null): string
    {
        $base = Str::slug($source) ?: 'category';
        $slug = $base;
        $suffix = 2;

        while (Category::where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
