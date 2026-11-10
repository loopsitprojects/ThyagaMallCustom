<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['items.product.merchant'])->latest();

        if ($status = $request->query('status')) {
            $query->where('order_status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        $orders = $query->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $orders->items(),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $order = Order::with(['items.product.images', 'items.product.merchant'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'order_status' => 'sometimes|required|in:pending,processing,shipped,delivered,cancelled',
            'payment_status' => 'sometimes|required|in:pending,paid,refunded',
            'notes' => 'nullable|string',
        ]);

        $order->update($validated);

        ActivityLog::record(
            'UPDATE_ORDER',
            "Updated Order #{$order->order_number} fulfillment status to ".strtoupper($order->order_status),
            'Order',
            $order->id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => "Order #{$order->order_number} status updated to {$order->order_status}",
            'data' => $order,
        ]);
    }

    /**
     * Generate structured merchant waybills for an order.
     */
    public function waybills(Request $request, int $id): JsonResponse
    {
        $order = Order::with(['items.product.merchant'])->findOrFail($id);
        $data = $this->buildOrderWaybills($order);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Render the printable HTML waybill view.
     */
    public function printWaybill(Request $request, int $id, ?int $merchantId = null)
    {
        $order = Order::with(['items.product.merchant'])->findOrFail($id);
        $data = $this->buildOrderWaybills($order);

        if ($merchantId !== null) {
            $data['waybills'] = array_values(array_filter($data['waybills'], function ($wb) use ($merchantId) {
                return (int) ($wb['merchant']['id'] ?? 0) === $merchantId;
            }));
        }

        return view('admin.waybill', [
            'order' => $data['order'],
            'waybills' => $data['waybills'],
            'logoUrl' => asset('logo.png'),
        ]);
    }

    /**
     * Build structured waybills grouped by merchant for an order.
     *
     * @return array{order: array<string, mixed>, waybills: array<int, array<string, mixed>>}
     */
    private function buildOrderWaybills(Order $order): array
    {
        $order->loadMissing(['items.product.merchant']);

        $groups = [];
        foreach ($order->items as $item) {
            $merchant = $item->product?->merchant;
            $merchantKey = $merchant ? (string) $merchant->id : 'direct';

            if (! isset($groups[$merchantKey])) {
                $groups[$merchantKey] = [
                    'merchant' => [
                        'id' => $merchant?->id ?? null,
                        'name' => $merchant?->name ?? 'Thyaga In-House / Direct',
                        'code' => $merchant?->code ?? 'DIRECT',
                        'phone' => $merchant?->phone ?? (string) config('thyaga.waybill.dispatch_contact', 'JOY- 0710982629'),
                        'contact_person' => $merchant?->contact_person ?? 'Thyaga Operations',
                        'email' => $merchant?->email ?? null,
                        'address' => $merchant?->address ?? (string) config('thyaga.waybill.store_address', 'No.2 Sulaiman Terrace, Colombo 5'),
                        'city' => $merchant?->city ?? 'Colombo 5',
                    ],
                    'items' => [],
                    'subtotal' => 0.0,
                ];
            }

            $unitPrice = (float) $item->unit_price;
            $qty = (int) $item->quantity;
            $totalPrice = (float) $item->total_price ?: ($unitPrice * $qty);

            $groups[$merchantKey]['items'][] = [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'sku' => $item->product?->sku ?? '',
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'total_price' => $totalPrice,
            ];

            $groups[$merchantKey]['subtotal'] += $totalPrice;
        }

        $waybills = [];
        $defaultDeliveryDate = (string) config('thyaga.waybill.default_delivery_date', 'Within 24 hours');
        $defaultDeliveryAddress = (string) config('thyaga.waybill.default_delivery_address', 'THYAGA OFFICE');
        $storeAddress = (string) config('thyaga.waybill.store_address', 'No.2 Sulaiman Terrace, Colombo 5');
        $dispatchContact = (string) config('thyaga.waybill.dispatch_contact', 'JOY- 0710982629');

        foreach ($groups as $group) {
            $subtotal = round((float) $group['subtotal'], 2);
            $deliveryCharges = 0.00;
            $grandTotal = round($subtotal + $deliveryCharges, 2);

            $waybills[] = [
                'merchant' => $group['merchant'],
                'order_no' => $order->order_number,
                'order_id' => $order->id,
                'date' => $order->created_at ? $order->created_at->format('d/m/Y') : now()->format('d/m/Y'),
                'delivery_date' => $defaultDeliveryDate,
                'delivery_address' => $defaultDeliveryAddress,
                'items' => $group['items'],
                'subtotal' => $subtotal,
                'delivery_charges' => $deliveryCharges,
                'grand_total' => $grandTotal,
                'store_address' => $storeAddress,
                'dispatch_contact' => $dispatchContact,
                'pickup_label' => 'Pickup-',
                'delivery_label' => 'Delivery-',
            ];
        }

        return [
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'created_at' => $order->created_at,
                'customer_name' => $order->customer_name,
                'customer_phone' => $order->customer_phone,
                'shipping_address' => $order->shipping_address,
                'shipping_city' => $order->shipping_city,
                'payment_method' => $order->payment_method,
                'order_status' => $order->order_status,
            ],
            'waybills' => $waybills,
        ];
    }
}
