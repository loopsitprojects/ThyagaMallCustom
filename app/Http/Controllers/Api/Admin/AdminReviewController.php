<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReviewController extends Controller
{
    /**
     * Reviews for moderation. Filter with ?status=pending|approved|all and ?search=.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Review::with('product:id,name,slug')->latest();

        $status = $request->query('status', 'pending');
        if ($status === 'pending') {
            $query->where('is_approved', false);
        } elseif ($status === 'approved') {
            $query->where('is_approved', true);
        }

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('comment', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('user_name', 'like', "%{$search}%")
                    ->orWhereHas('product', fn ($p) => $p->where('name', 'like', "%{$search}%"));
            });
        }

        $reviews = $query->paginate(20);
        $reviews->getCollection()->each->makeVisible('user_email');

        return response()->json([
            'success' => true,
            'data' => $reviews->items(),
            'counts' => [
                'pending' => Review::where('is_approved', false)->count(),
                'approved' => Review::where('is_approved', true)->count(),
                'all' => Review::count(),
            ],
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $review = Review::with('product')->findOrFail($id);
        $validated = $request->validate(['is_approved' => 'required|boolean']);

        $review->update(['is_approved' => $validated['is_approved']]);
        $review->product?->refreshRatingStats();

        $action = $validated['is_approved'] ? 'Approved' : 'Hid';
        ActivityLog::record($validated['is_approved'] ? 'APPROVE_REVIEW' : 'HIDE_REVIEW', "{$action} {$review->rating}-star review by {$review->user_name} on '{$review->product?->name}'", 'Review', $review->id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => $validated['is_approved'] ? 'Review approved and published' : 'Review hidden from the store',
            'data' => $review->makeVisible('user_email'),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $review = Review::with('product')->findOrFail($id);
        $review->delete();
        $review->product?->refreshRatingStats();

        ActivityLog::record('DELETE_REVIEW', "Deleted review by {$review->user_name} on '{$review->product?->name}'", 'Review', $id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => 'Review deleted',
        ]);
    }
}
