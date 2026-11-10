@php
    $money = fn ($amount) => 'Rs.'.number_format((float) $amount, 2);
    $merchantLines = $isStoreCopy ? $order->items->filter(fn ($item) => $item->product?->merchant) : collect();
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $heading }}</title>
</head>
<body style="margin:0;padding:0;background:#f4f2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f1f1f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f7;padding:24px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
                <tr>
                    <td style="padding:28px 32px 8px;">
                        <img src="{{ file_exists($logoPath) ? $message->embed($logoPath) : $logoUrl }}" alt="{{ config('app.name') }}" width="120" style="display:block;width:120px;height:auto;border:0;">
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 32px 0;">
                        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:800;color:#1f1f1f;">{{ $heading }}</h1>
                        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;">{{ $intro }}</p>

                        <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;">Order summary</h2>
                        <p style="margin:0 0 20px;font-size:12px;color:#6b6b6b;">
                            <a href="{{ $orderUrl }}" style="color:#7c3aed;text-decoration:none;">Order #{{ $order->order_number }}</a>
                            ({{ $order->created_at->format('F j, Y g:i A') }})
                        </p>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;">
                            <tr>
                                <th align="left" style="padding:0 0 10px;font-weight:700;">Product</th>
                                <th align="right" style="padding:0 0 10px;font-weight:700;white-space:nowrap;">Quantity</th>
                                <th align="right" style="padding:0 0 10px 12px;font-weight:700;">Price</th>
                            </tr>
                            @foreach ($order->items as $item)
                                <tr>
                                    <td style="padding:12px 0;border-top:1px solid #e7e5ea;">
                                        <table role="presentation" cellpadding="0" cellspacing="0">
                                            <tr>
                                                @if ($item->product_image)
                                                    <td style="padding-right:12px;vertical-align:middle;">
                                                        <img src="{{ $item->product_image }}" alt="" width="44" height="44" style="display:block;width:44px;height:44px;object-fit:cover;border-radius:6px;border:0;">
                                                    </td>
                                                @endif
                                                <td style="vertical-align:middle;line-height:1.5;">
                                                    {{ $item->product_name }}
                                                    @if ($isStoreCopy && $item->product?->sku)
                                                        <br><span style="color:#6b6b6b;">(#{{ $item->product->sku }})</span>
                                                    @endif
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td align="right" style="padding:12px 0;border-top:1px solid #e7e5ea;white-space:nowrap;">&times;{{ $item->quantity }}</td>
                                    <td align="right" style="padding:12px 0 12px 12px;border-top:1px solid #e7e5ea;white-space:nowrap;">{{ $money($item->total_price) }}</td>
                                </tr>
                            @endforeach
                        </table>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;margin-top:8px;border-top:2px solid #e7e5ea;">
                            <tr>
                                <td style="padding:14px 0 6px;">Subtotal:</td>
                                <td align="right" style="padding:14px 0 6px;">{{ $money($order->subtotal) }}</td>
                            </tr>
                            @if ((float) $order->discount > 0)
                                <tr>
                                    <td style="padding:6px 0;">Discount{{ $order->voucher_code ? " ({$order->voucher_code})" : '' }}:</td>
                                    <td align="right" style="padding:6px 0;">&minus;{{ $money($order->discount) }}</td>
                                </tr>
                            @endif
                            <tr>
                                <td style="padding:6px 0;">Shipping:</td>
                                <td align="right" style="padding:6px 0;">{{ $order->delivery_method === 'pickup' ? 'Store pickup (free)' : ((float) $order->shipping_fee > 0 ? $money($order->shipping_fee) : 'Free shipping') }}</td>
                            </tr>
                            <tr>
                                <td style="padding:6px 0;font-weight:700;">Total:</td>
                                <td align="right" style="padding:6px 0;font-weight:800;font-size:16px;">{{ $money($order->total) }}</td>
                            </tr>
                            <tr>
                                <td style="padding:6px 0;">Payment method:</td>
                                <td align="right" style="padding:6px 0;">{{ $paymentMethodLabel }}</td>
                            </tr>
                            <tr>
                                <td style="padding:6px 0 14px;">Payment status:</td>
                                <td align="right" style="padding:6px 0 14px;">{{ ucfirst($order->payment_status) }}</td>
                            </tr>
                        </table>

                        @if ($merchantLines->isNotEmpty())
                            <div style="border-top:1px solid #e7e5ea;padding:16px 0;">
                                <h3 style="margin:0 0 8px;font-size:14px;font-weight:700;">Merchant info</h3>
                                <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.7;">
                                    @foreach ($merchantLines as $item)
                                        <li>{{ $item->product_name }} &mdash; {{ $item->product->merchant->name }}</li>
                                    @endforeach
                                </ul>
                            </div>
                        @endif

                        <div style="border-top:1px solid #e7e5ea;padding:16px 0;">
                            @if ($order->delivery_method === 'pickup')
                                <h3 style="margin:0 0 8px;font-size:14px;font-weight:700;">Store pickup</h3>
                                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;">Collect this order from the store below. We'll contact you when it's ready.</p>
                            @else
                                <h3 style="margin:0 0 8px;font-size:14px;font-weight:700;">Billing &amp; shipping address</h3>
                            @endif
                            <p style="margin:0;font-size:13px;line-height:1.6;">
                                @if ($order->delivery_method !== 'pickup')
                                    {{ $order->customer_name }}<br>
                                @endif
                                {!! nl2br(e($order->shipping_address)) !!}<br>
                                {{ $order->shipping_city }}
                                @if ($order->shipping_postal_code)
                                    <br>{{ $order->shipping_postal_code }}
                                @endif
                                <br><a href="tel:{{ $order->customer_phone }}" style="color:#7c3aed;">{{ $order->customer_phone }}</a>
                                <br><a href="mailto:{{ $order->customer_email }}" style="color:#7c3aed;">{{ $order->customer_email }}</a>
                            </p>
                        </div>

                        @if ($order->notes)
                            <div style="border-top:1px solid #e7e5ea;padding:16px 0;">
                                <h3 style="margin:0 0 8px;font-size:14px;font-weight:700;">Customer note</h3>
                                <p style="margin:0;font-size:13px;line-height:1.6;">{!! nl2br(e($order->notes)) !!}</p>
                            </div>
                        @endif
                    </td>
                </tr>
                <tr>
                    <td align="center" style="padding:20px 32px 32px;font-size:14px;line-height:1.6;">
                        @if ($isStoreCopy)
                            Congratulations on the sale!
                        @else
                            <a href="{{ $orderUrl }}" style="display:inline-block;margin-bottom:16px;padding:12px 24px;background:#36135d;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">View your order</a><br>
                            Questions about your order? Just reply to this email.
                        @endif
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
