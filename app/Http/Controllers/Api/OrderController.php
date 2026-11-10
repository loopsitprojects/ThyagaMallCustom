<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendOrderPlacedEmails;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Voucher;
use App\Services\StorePickupSettings;
use App\Services\ThyagaVoucherService;
use App\Services\WebxpayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'customer_phone' => 'required|string|max:50',
            'delivery_method' => 'sometimes|string|in:delivery,pickup',
            // Not needed for store pickup: the store's own address is saved instead.
            'shipping_address' => 'exclude_if:delivery_method,pickup|required|string',
            'shipping_city' => 'exclude_if:delivery_method,pickup|required|string|max:100',
            'shipping_postal_code' => 'exclude_if:delivery_method,pickup|nullable|string|max:20',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:100',
            'voucher_code' => 'nullable|string',
            'voucher_redemption_id' => 'nullable|string',
            'voucher_owner_name' => 'nullable|string',
            // Ignored: the voucher amount is taken from the server-side hold record.
            'voucher_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'required|string|in:cod,card,webxpay,voucher,voucher_cod',
            'notes' => 'nullable|string',
        ]);

        $isPickup = ($validated['delivery_method'] ?? 'delivery') === 'pickup';

        if ($isPickup) {
            $pickup = app(StorePickupSettings::class)->get();

            if (! $pickup['enabled']) {
                throw ValidationException::withMessages([
                    'delivery_method' => ['Store pickup is not available right now. Please choose home delivery.'],
                ]);
            }

            // Saved on the order so staff, receipts and emails show where it is collected.
            $validated['shipping_address'] = $pickup['name'].', '.$pickup['address'];
            $validated['shipping_city'] = $pickup['city'];
        }

        return DB::transaction(function () use ($validated, $isPickup) {
            $subtotal = 0;
            $orderItemsData = [];

            foreach ($validated['items'] as $item) {
                $product = Product::with('images')->lockForUpdate()->findOrFail($item['product_id']);

                if (! $product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => ["\"{$product->name}\" is no longer available."],
                    ]);
                }

                if ($product->stock_quantity < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => ["Only {$product->stock_quantity} of \"{$product->name}\" left in stock."],
                    ]);
                }
                $price = $product->sale_price ?: $product->regular_price;
                $lineTotal = $price * $item['quantity'];
                $subtotal += $lineTotal;

                $primaryImg = $product->primary_image;

                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_image' => $primaryImg,
                    'unit_price' => $price,
                    'quantity' => $item['quantity'],
                    'total_price' => $lineTotal,
                ];

                // Decrement stock
                $product->decrement('stock_quantity', $item['quantity']);
            }

            // Shipping fee: none for store pickup, otherwise FREE if order over Rs. 2,999
            $shippingFee = ($isPickup || $subtotal >= 2999) ? 0.00 : 350.00;

            // Calculate voucher discount (Thyāga API or local DB)
            $discount = 0.00;
            $voucherCode = null;
            $redemptionId = $validated['voucher_redemption_id'] ?? null;
            $thyagaService = app(ThyagaVoucherService::class);

            if ($redemptionId) {
                // The discount must come from a hold this server verified via OTP —
                // never from an amount supplied by the browser. Each hold is single-use.
                $heldAmount = Cache::pull(ThyagaVoucherController::holdCacheKey($redemptionId));

                if (! $thyagaService->isConfigured()
                    || $heldAmount === null
                    || ! $thyagaService->validateHoldStatus($redemptionId)) {
                    throw ValidationException::withMessages([
                        'voucher_redemption_id' => ['The Thyāga voucher hold has expired or is invalid. Please re-verify your voucher.'],
                    ]);
                }

                $discount = min($subtotal + $shippingFee, (float) $heldAmount);
                $voucherCode = $validated['voucher_code'] ?? 'THYAGA-VOUCHER';
            } elseif (! empty($validated['voucher_code'])) {
                $voucher = Voucher::where('code', strtoupper(trim($validated['voucher_code'])))->first();
                if ($voucher && $voucher->isValidForAmount($subtotal)) {
                    $discount = $voucher->calculateDiscount($subtotal);
                    $voucherCode = $voucher->code;
                    $voucher->increment('times_used');
                }
            }

            $total = max(0, ($subtotal - $discount) + $shippingFee);
            // Long random suffix so order numbers (which unlock order details) can't be guessed.
            do {
                $orderNumber = 'THY-'.now()->format('Ymd').'-'.strtoupper(Str::random(10));
            } while (Order::where('order_number', $orderNumber)->exists());

            // Only link the order to an account when that customer is actually signed in.
            // (Emails are unverified, so matching guest orders by email would leak them.)
            $authUser = auth('sanctum')->user();
            $userId = $authUser instanceof User && $authUser->role === 'customer'
                ? $authUser->id
                : null;

            $isOnlinePayment = in_array($validated['payment_method'], ['card', 'webxpay']) && $total > 0;
            $paymentStatus = ($validated['payment_method'] === 'voucher' && $total == 0) ? 'paid' : 'pending';

            $order = Order::create([
                'order_number' => $orderNumber,
                'user_id' => $userId,
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'],
                'customer_phone' => $validated['customer_phone'],
                'shipping_address' => $validated['shipping_address'],
                'shipping_city' => $validated['shipping_city'],
                'shipping_postal_code' => $validated['shipping_postal_code'] ?? null,
                'delivery_method' => $isPickup ? 'pickup' : 'delivery',
                'subtotal' => $subtotal,
                'discount' => $discount,
                'shipping_fee' => $shippingFee,
                'total' => $total,
                'voucher_code' => $voucherCode,
                'voucher_redemption_id' => $redemptionId,
                'voucher_owner_name' => $validated['voucher_owner_name'] ?? null,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $paymentStatus,
                'order_status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($orderItemsData as $itemData) {
                $itemData['order_id'] = $order->id;
                OrderItem::create($itemData);
            }

            // If order has a held Thyāga redemption and no online gateway pending (COD or fully paid by voucher), complete it immediately
            if ($redemptionId && ! $isOnlinePayment && $thyagaService->isConfigured()) {
                $thyagaService->completeRedemption($redemptionId, $order->order_number);
            }

            $responseData = [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'total' => $order->total,
                'shipping_fee' => $order->shipping_fee,
                'delivery_method' => $order->delivery_method,
                'discount' => $order->discount,
                'order_status' => $order->order_status,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
            ];

            if ($isOnlinePayment) {
                $webxpayService = app(WebxpayService::class);
                $paymentPayload = $webxpayService->preparePaymentPayload($order);
                $responseData['payment_url'] = $paymentPayload['gateway_url'];
                $responseData['payment_params'] = $paymentPayload['params'];
                $responseData['redirect_required'] = true;
            } else {
                // Online payments notify the store once WebXpay confirms the payment instead.
                DB::afterCommit(fn () => SendOrderPlacedEmails::dispatchAfterResponse($order));
            }

            return response()->json([
                'success' => true,
                'message' => $isOnlinePayment
                    ? 'Order placed. Redirecting to WebXpay secure gateway...'
                    : 'Thank you! Your order has been placed successfully.',
                'data' => $responseData,
            ], 201);
        });
    }

    public function show(string $orderNumber): JsonResponse
    {
        $order = Order::where('order_number', $orderNumber)
            ->with('items')
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }
}
