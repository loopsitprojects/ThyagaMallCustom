<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ThyagaVoucherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ThyagaVoucherController extends Controller
{
    protected ThyagaVoucherService $service;

    /** How long a verified voucher hold can be used to place an order. */
    protected const HOLD_TTL_MINUTES = 30;

    public function __construct(ThyagaVoucherService $service)
    {
        $this->service = $service;
    }

    /**
     * Cache key holding the amount this server verified for a redemption.
     * OrderController reads it so the discount can't be set by the browser.
     */
    public static function holdCacheKey(string $redemptionId): string
    {
        return 'thyaga_hold:'.hash('sha256', $redemptionId);
    }

    /**
     * Check voucher status, owner name, balance, and masked phone
     * GET /api/vouchers/thyaga/details/{code}
     */
    public function details(string $code): JsonResponse
    {
        if (! $this->service->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Thyāga Voucher integration is not yet configured. Please set THYAGA_VOUCHER_API_KEY in .env.',
            ], 503);
        }

        $result = $this->service->getVoucherDetails($code);

        // Never expose the voucher owner's full phone number — the UI only needs the masked one.
        if (isset($result['data']) && is_array($result['data'])) {
            unset($result['data']['ownerMobile']);
        }

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],
            'data' => $result['data'] ?? null,
            'error_code' => $result['error_code'] ?? null,
        ], $result['success'] ? 200 : ($result['status_code'] ?? 400));
    }

    /**
     * Initiate redemption and trigger SMS OTP
     * POST /api/vouchers/thyaga/initiate
     */
    public function initiate(Request $request): JsonResponse
    {
        if (! $this->service->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Thyāga Voucher integration is not configured.',
            ], 503);
        }

        $validated = $request->validate([
            'voucher_id' => 'required|string|max:128',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $result = $this->service->initiateRedemption(
            $validated['voucher_id'],
            (float) $validated['amount']
        );

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],
            'data' => $result['data'] ?? null,
            'error_code' => $result['error_code'] ?? null,
        ], $result['success'] ? 200 : ($result['status_code'] ?? 400));
    }

    /**
     * Verify OTP and place funds on-hold
     * POST /api/vouchers/thyaga/verify-otp
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        if (! $this->service->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Thyāga Voucher integration is not configured.',
            ], 503);
        }

        $validated = $request->validate([
            'redemption_id' => ['required', 'string', 'max:128', 'regex:/^[A-Za-z0-9_\-]+$/'],
            'amount' => 'required|numeric|min:0.01',
            'otp' => 'required|string|min:4|max:10',
        ]);

        $result = $this->service->verifyOtpAndHold(
            $validated['redemption_id'],
            (float) $validated['amount'],
            $validated['otp']
        );

        if ($result['success']) {
            Cache::put(
                self::holdCacheKey($validated['redemption_id']),
                (float) ($result['data']['amount'] ?? $validated['amount']),
                now()->addMinutes(self::HOLD_TTL_MINUTES)
            );
        }

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],
            'data' => $result['data'] ?? null,
            'error_code' => $result['error_code'] ?? null,
        ], $result['success'] ? 200 : ($result['status_code'] ?? 400));
    }

    /**
     * Cancel on-hold redemption and release voucher funds
     * POST /api/vouchers/thyaga/cancel
     */
    public function cancel(Request $request): JsonResponse
    {
        if (! $this->service->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Thyāga Voucher integration is not configured.',
            ], 503);
        }

        $validated = $request->validate([
            'redemption_id' => ['required', 'string', 'max:128', 'regex:/^[A-Za-z0-9_\-]+$/'],
        ]);

        $result = $this->service->cancelRedemption($validated['redemption_id']);
        Cache::forget(self::holdCacheKey($validated['redemption_id']));

        return response()->json([
            'success' => $result['success'],
            'message' => $result['success'] ? 'Voucher reservation cancelled successfully.' : $result['message'],
            'data' => $result['data'] ?? null,
        ], $result['success'] ? 200 : ($result['status_code'] ?? 400));
    }

    /**
     * Health check endpoint
     * GET /api/vouchers/thyaga/health
     */
    public function health(): JsonResponse
    {
        if (! $this->service->isConfigured()) {
            return response()->json([
                'status' => 'not_configured',
                'message' => 'THYAGA_VOUCHER_API_KEY is missing.',
            ], 200);
        }

        $result = $this->service->healthCheck();

        return response()->json([
            'status' => $result['success'] ? 'online' : 'error',
            'message' => $result['success'] ? 'Connected' : 'Voucher network unavailable',
        ], $result['success'] ? 200 : 500);
    }
}
