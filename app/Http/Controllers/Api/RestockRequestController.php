<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\RestockRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RestockRequestController extends Controller
{
    /**
     * Save a shopper's email to be told when an out-of-stock product returns.
     * Asking again re-arms the alert if an earlier one has already been sent.
     */
    public function store(Request $request, string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $validated = $request->validate([
            'email' => 'required|email|max:255',
        ]);

        if ($product->stock_quantity > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Good news: this product is back in stock.',
            ], 422);
        }

        RestockRequest::updateOrCreate(
            ['product_id' => $product->id, 'email' => strtolower(trim($validated['email']))],
            ['notified_at' => null],
        );

        return response()->json([
            'success' => true,
            'message' => "We'll email you when this product is back in stock.",
        ], 201);
    }
}
