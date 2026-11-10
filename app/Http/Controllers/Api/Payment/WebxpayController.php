<?php

namespace App\Http\Controllers\Api\Payment;

use App\Http\Controllers\Controller;
use App\Jobs\SendOrderPlacedEmails;
use App\Models\Order;
use App\Services\ThyagaVoucherService;
use App\Services\WebxpayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebxpayController extends Controller
{
    protected WebxpayService $webxpayService;

    public function __construct(WebxpayService $webxpayService)
    {
        $this->webxpayService = $webxpayService;
    }

    /**
     * Generate WebXpay payment payload for an existing order
     */
    public function initiate(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::where('order_number', $orderNumber)->first();

        if (! $order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        }

        if ($order->payment_status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'This order is already paid.',
            ], 400);
        }

        $payload = $this->webxpayService->preparePaymentPayload($order);

        return response()->json([
            'success' => true,
            'message' => 'WebXpay payment details generated.',
            'data' => $payload,
        ]);
    }

    /**
     * Handle payment return / callback from WebXpay gateway
     */
    public function callback(Request $request)
    {
        $result = $this->webxpayService->verifyCallback($request);
        $orderNumber = $result['order_number'];

        Log::info('WebXpay callback processing', [
            'order_number' => $orderNumber,
            'status' => $result['status'],
            'transaction_id' => $result['transaction_id'],
        ]);

        $order = null;
        if ($orderNumber) {
            $order = Order::where('order_number', $orderNumber)->first();
        }

        if (! $order) {
            Log::error('WebXpay Callback: Order not found for reference '.($orderNumber ?: 'empty'));
            $fallbackUrl = $this->webxpayService->getFrontendRedirectUrl('', false, 'Order reference not recognized');

            return redirect()->away($fallbackUrl);
        }

        // Already settled (e.g. gateway retried the callback) — don't process twice.
        if ($order->payment_status === 'paid') {
            return redirect()->away($this->webxpayService->getFrontendRedirectUrl($order->order_number, true));
        }

        if ($result['is_valid'] && $result['status'] === 'success') {
            $order->update([
                'payment_status' => 'paid',
                'order_status' => $order->order_status === 'pending' ? 'processing' : $order->order_status,
                'notes' => trim(($order->notes ? $order->notes."\n" : '')."[WebXpay Transaction ID: {$result['transaction_id']}]"),
            ]);

            // Finalize / burn held Thyāga voucher if applied
            if (! empty($order->voucher_redemption_id)) {
                $voucherService = app(ThyagaVoucherService::class);
                if ($voucherService->isConfigured()) {
                    $voucherService->completeRedemption($order->voucher_redemption_id, $order->order_number);
                }
            }

            SendOrderPlacedEmails::dispatchAfterResponse($order);

            $successUrl = $this->webxpayService->getFrontendRedirectUrl($order->order_number, true);

            return redirect()->away($successUrl);
        }

        // Failed, cancelled or unverifiable payment — leave the order untouched
        // (unsigned requests are attacker-controllable, so don't write their text to the order).
        Log::warning('WebXpay payment not confirmed', ['order_number' => $order->order_number, 'message' => $result['message']]);

        $failedUrl = $this->webxpayService->getFrontendRedirectUrl($order->order_number, false, $result['message']);

        return redirect()->away($failedUrl);
    }
}
