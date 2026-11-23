<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ThyagaVoucherHold;
use App\Services\ThyagaVoucherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ThyagaVoucherController extends Controller
{
    protected ThyagaVoucherService $service;

    public function __construct(ThyagaVoucherService $service)
    {
        $this->service = $service;
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
            'voucher_code' => 'nullable|string|max:64',
        ]);

        $result = $this->service->verifyOtpAndHold(
            $validated['redemption_id'],
            (float) $validated['amount'],
            $validated['otp']
        );

        if ($result['success']) {
            // The order reads the amount from here, so the discount can't be set by the browser.
            ThyagaVoucherHold::updateOrCreate(
                ['redemption_id' => $validated['redemption_id']],
                [
                    'voucher_code' => isset($validated['voucher_code']) ? strtoupper(trim($validated['voucher_code'])) : null,
                    'amount' => (float) ($result['data']['amount'] ?? $validated['amount']),
                    'status' => ThyagaVoucherHold::STATUS_HELD,
                    'expires_at' => now()->addMinutes(ThyagaVoucherHold::LIFETIME_MINUTES),
                ],
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

        ThyagaVoucherHold::where('redemption_id', $validated['redemption_id'])
            ->where('status', ThyagaVoucherHold::STATUS_HELD)
            ->update(['status' => ThyagaVoucherHold::STATUS_RELEASED, 'released_at' => now()]);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['success'] ? 'Voucher reservation cancelled successfully.' : $result['message'],
            'data' => $result['data'] ?? null,
        ], $result['success'] ? 200 : ($result['status_code'] ?? 400));
    }

    /**
     * A verified hold that can still be used, so checkout can restore the discount after a page refresh.
     * GET /api/vouchers/thyaga/hold/{redemptionId}
     */
    public function hold(string $redemptionId): JsonResponse
    {
        $hold = ThyagaVoucherHold::usable()->where('redemption_id', $redemptionId)->first();

        if (! $hold || ! $this->service->validateHoldStatus($hold->redemption_id)) {
            return response()->json([
                'success' => false,
                'message' => 'This voucher reservation has expired. Please redeem the voucher again.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'redemption_id' => $hold->redemption_id,
                'voucher_code' => $hold->voucher_code,
                'amount' => (float) $hold->amount,
                'expires_at' => $hold->expires_at->toIso8601String(),
            ],
        ]);
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
