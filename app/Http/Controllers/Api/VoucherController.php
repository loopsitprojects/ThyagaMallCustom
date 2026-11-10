<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VoucherController extends Controller
{
    public function apply(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'subtotal' => 'required|numeric|min:0',
        ]);

        $voucher = Voucher::where('code', strtoupper(trim($validated['code'])))->first();

        if (! $voucher) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid Thyaga voucher code. Please check and try again.',
            ], 422);
        }

        if (! $voucher->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'This voucher is currently inactive.',
            ], 422);
        }

        if ($voucher->expires_at && $voucher->expires_at->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'This voucher has expired.',
            ], 422);
        }

        if ($voucher->usage_limit && $voucher->times_used >= $voucher->usage_limit) {
            return response()->json([
                'success' => false,
                'message' => 'This voucher has reached its redemption limit.',
            ], 422);
        }

        $subtotal = (float) $validated['subtotal'];
        if ($subtotal < $voucher->min_order_amount) {
            return response()->json([
                'success' => false,
                'message' => 'This voucher requires a minimum order value of Rs. '.number_format($voucher->min_order_amount, 2),
            ], 422);
        }

        $discount = $voucher->calculateDiscount($subtotal);

        return response()->json([
            'success' => true,
            'data' => [
                'code' => $voucher->code,
                'title' => $voucher->title,
                'discount' => $discount,
                'new_total' => max(0, $subtotal - $discount),
            ],
            'message' => 'Thyaga Voucher applied successfully! You saved Rs. '.number_format($discount, 2),
        ]);
    }
}
