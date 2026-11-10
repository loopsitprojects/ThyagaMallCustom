<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\RestockRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin → Restock Alerts: the emails shoppers left on out-of-stock products, grouped by product.
 */
class AdminRestockRequestController extends Controller
{
    private const PRODUCTS_PER_PAGE = 15;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|in:waiting,notified',
            'search' => 'nullable|string|max:255',
        ]);

        $status = $validated['status'] ?? null;
        $search = $validated['search'] ?? null;

        $matchingStatus = function ($query) use ($status) {
            return $query
                ->when($status === 'waiting', fn ($q) => $q->whereNull('notified_at'))
                ->when($status === 'notified', fn ($q) => $q->whereNotNull('notified_at'));
        };

        $products = Product::query()
            ->whereHas('restockRequests', $matchingStatus)
            ->when($search, fn ($query) => $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhereHas('restockRequests', fn ($r) => $r->where('email', 'like', "%{$search}%"));
            }))
            ->with(['images', 'restockRequests' => fn ($query) => $matchingStatus($query)->latest()->orderByDesc('id')])
            ->withMax('restockRequests', 'created_at')
            ->orderByDesc('restock_requests_max_created_at')
            ->orderByDesc('id')
            ->paginate(self::PRODUCTS_PER_PAGE);

        return response()->json([
            'success' => true,
            'data' => $products->items(),
            'stats' => [
                'waiting' => RestockRequest::waiting()->count(),
                'notified' => RestockRequest::whereNotNull('notified_at')->count(),
            ],
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $restockRequest = RestockRequest::findOrFail($id);
        $restockRequest->delete();

        ActivityLog::record('DELETE_RESTOCK_REQUEST', "Removed a restock alert for product #{$restockRequest->product_id}", 'RestockRequest', $id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => 'Email removed',
        ]);
    }
}
