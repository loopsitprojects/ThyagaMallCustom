<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Merchant;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminMerchantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Merchant::withCount('products');

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('business_type', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'latest');
        switch ($sortBy) {
            case 'name_asc':
                $query->orderBy('name', 'asc');
                break;
            case 'name_desc':
                $query->orderBy('name', 'desc');
                break;
            case 'products_count':
                $query->orderBy('products_count', 'desc');
                break;
            case 'commission':
                $query->orderBy('commission_rate', 'desc');
                break;
            case 'oldest':
                $query->orderBy('created_at', 'asc');
                break;
            case 'latest':
            default:
                $query->latest();
                break;
        }

        // Global stats
        $stats = [
            'total_merchants' => Merchant::count(),
            'active_merchants' => Merchant::where('status', 'active')->count(),
            'pending_merchants' => Merchant::where('status', 'pending')->count(),
            'inactive_merchants' => Merchant::where('status', 'inactive')->count(),
            'total_assigned_products' => Product::whereNotNull('merchant_id')->count(),
            'avg_commission' => round((float) Merchant::avg('commission_rate') ?: 0, 1),
        ];

        // All vs Paginated
        if ($request->input('all') === 'true' || $request->input('per_page') === 'all') {
            $merchants = $query->get();

            return response()->json([
                'success' => true,
                'stats' => $stats,
                'data' => $merchants,
            ]);
        }

        $perPage = (int) $request->input('per_page', 12);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'stats' => $stats,
            'data' => $paginated->items(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $merchant = Merchant::withCount('products')
            ->with(['products' => function ($q) {
                $q->with('images', 'category')->take(15);
            }])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $merchant,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:merchants,code',
            'business_type' => 'nullable|string|max:100',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'logo_url' => 'nullable|url',
            'banner_url' => 'nullable|url',
            'website' => 'nullable|url',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,pending,inactive',
            'is_featured' => 'nullable|boolean',
        ]);

        // Generate unique slug
        $baseSlug = Str::slug($validated['name']);
        $slug = $baseSlug;
        $counter = 1;
        while (Merchant::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }
        $validated['slug'] = $slug;

        // Auto-generate code if empty
        if (empty($validated['code'])) {
            $prefix = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $validated['name']), 0, 3));
            if (strlen($prefix) < 3) {
                $prefix = 'MER';
            }
            $validated['code'] = "MER-{$prefix}-".rand(100, 999);
        }

        // Default logo if empty
        if (empty($validated['logo_url'])) {
            $encodedName = urlencode($validated['name']);
            $validated['logo_url'] = "https://ui-avatars.com/api/?name={$encodedName}&background=36135d&color=fff&size=200";
        }

        $merchant = Merchant::create($validated);

        if ($request->user()) {
            ActivityLog::record(
                'CREATE_MERCHANT',
                "Created merchant partner '{$merchant->name}' ({$merchant->code})",
                'Merchant',
                $merchant->id,
                $request->user(),
                $request
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Merchant partner registered successfully',
            'data' => $merchant->loadCount('products'),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $merchant = Merchant::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('merchants')->ignore($merchant->id)],
            'business_type' => 'nullable|string|max:100',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'logo_url' => 'nullable|url',
            'banner_url' => 'nullable|url',
            'website' => 'nullable|url',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,pending,inactive',
            'is_featured' => 'nullable|boolean',
        ]);

        if (isset($validated['name']) && $validated['name'] !== $merchant->name) {
            $baseSlug = Str::slug($validated['name']);
            $slug = $baseSlug;
            $counter = 1;
            while (Merchant::where('slug', $slug)->where('id', '!=', $merchant->id)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        $merchant->update($validated);

        if ($request->user()) {
            ActivityLog::record(
                'UPDATE_MERCHANT',
                "Updated merchant partner '{$merchant->name}' ({$merchant->code})",
                'Merchant',
                $merchant->id,
                $request->user(),
                $request
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Merchant details updated successfully',
            'data' => $merchant->loadCount('products'),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $merchant = Merchant::findOrFail($id);
        $name = $merchant->name;
        $code = $merchant->code;

        // Dissociate products
        Product::where('merchant_id', $merchant->id)->update(['merchant_id' => null]);

        $merchant->delete();

        if ($request->user()) {
            ActivityLog::record(
                'DELETE_MERCHANT',
                "Deleted merchant partner '{$name}' ({$code})",
                'Merchant',
                $id,
                $request->user(),
                $request
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Merchant partner deleted successfully',
        ]);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $merchant = Merchant::findOrFail($id);
        $newStatus = $request->input('status');

        if (! $newStatus) {
            $newStatus = $merchant->status === 'active' ? 'inactive' : 'active';
        }

        $merchant->update(['status' => $newStatus]);

        if ($request->user()) {
            ActivityLog::record(
                'UPDATE_MERCHANT_STATUS',
                "Changed status of merchant '{$merchant->name}' to ".strtoupper($newStatus),
                'Merchant',
                $merchant->id,
                $request->user(),
                $request
            );
        }

        return response()->json([
            'success' => true,
            'message' => "Merchant status updated to {$newStatus}",
            'data' => $merchant->loadCount('products'),
        ]);
    }

    public function products(Request $request, int $id): JsonResponse
    {
        $merchant = Merchant::findOrFail($id);

        $products = Product::where('merchant_id', $merchant->id)
            ->with('images', 'category')
            ->latest()
            ->paginate((int) $request->input('per_page', 12));

        return response()->json([
            'success' => true,
            'merchant' => [
                'id' => $merchant->id,
                'name' => $merchant->name,
                'code' => $merchant->code,
                'logo_url' => $merchant->logo_url,
            ],
            'data' => $products->items(),
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'total' => $products->total(),
            ],
        ]);
    }
}
