<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductReviewController extends Controller
{
    /**
     * Approved reviews for a product, newest first, with a rating summary.
     */
    public function index(string $slug): JsonResponse
    {
        $product = $this->findProduct($slug);

        $reviews = Review::where('product_id', $product->id)
            ->where('is_approved', true)
            ->latest()
            ->paginate(10, ['id', 'user_name', 'rating', 'title', 'comment', 'is_verified_purchase', 'created_at']);

        $distribution = Review::where('product_id', $product->id)
            ->where('is_approved', true)
            ->selectRaw('rating, COUNT(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

        return response()->json([
            'success' => true,
            'data' => $reviews->items(),
            'summary' => [
                'average' => (float) $product->rating_avg,
                'count' => (int) $product->reviews_count,
                'distribution' => collect([5, 4, 3, 2, 1])->mapWithKeys(fn (int $stars) => [$stars => (int) ($distribution[$stars] ?? 0)]),
            ],
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }

    /**
     * The signed-in customer's own review of this product (approved or pending), if any.
     */
    public function mine(Request $request, string $slug): JsonResponse
    {
        $product = $this->findProduct($slug);

        return response()->json([
            'success' => true,
            'data' => Review::where('product_id', $product->id)->where('user_id', $request->user()->id)->first(),
        ]);
    }

    /**
     * Create or update the signed-in customer's review. Every submission waits for admin approval.
     */
    public function store(Request $request, string $slug): JsonResponse
    {
        $product = $this->findProduct($slug);
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'rating' => 'required|integer|between:1,5',
            'title' => 'nullable|string|max:120',
            'comment' => 'required|string|min:10|max:2000',
        ]);

        $review = Review::updateOrCreate(
            ['product_id' => $product->id, 'user_id' => $user->id],
            [
                ...$validated,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'is_approved' => false,
                'is_verified_purchase' => $this->hasPurchased($user, $product),
            ],
        );

        // An edited review leaves the public listing until it is re-approved.
        $product->refreshRatingStats();

        return response()->json([
            'success' => true,
            'message' => 'Thanks for your review! It will appear once our team approves it.',
            'data' => $review,
        ], $review->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, string $slug): JsonResponse
    {
        $product = $this->findProduct($slug);

        Review::where('product_id', $product->id)->where('user_id', $request->user()->id)->firstOrFail()->delete();
        $product->refreshRatingStats();

        return response()->json([
            'success' => true,
            'message' => 'Your review has been removed.',
        ]);
    }

    private function findProduct(string $slug): Product
    {
        return Product::where('slug', $slug)->where('is_active', true)->firstOrFail();
    }

    private function hasPurchased(User $user, Product $product): bool
    {
        return Order::where('user_id', $user->id)
            ->where('order_status', '!=', 'cancelled')
            ->whereHas('items', fn ($query) => $query->where('product_id', $product->id))
            ->exists();
    }
}
