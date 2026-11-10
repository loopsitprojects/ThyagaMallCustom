<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * "New order" alert sent to the store's notification recipients.
 */
class NewOrderPlaced extends Mailable
{
    public const PAYMENT_METHOD_LABELS = [
        'cod' => 'Cash on Delivery',
        'card' => 'Pay Online - Cards & Mobile Wallets',
        'webxpay' => 'Pay Online - Cards & Mobile Wallets',
        'voucher' => 'Thyāga Voucher',
        'voucher_cod' => 'Thyāga Voucher + Cash on Delivery',
    ];

    public function __construct(public Order $order)
    {
        $this->order->loadMissing('items.product.merchant');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '['.config('app.name')."]: New order #{$this->order->order_number}",
            replyTo: [$this->order->customer_email],
        );
    }

    public function content(): Content
    {
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');

        return new Content(
            view: 'emails.order',
            with: [
                'isStoreCopy' => true,
                'heading' => "New order: #{$this->order->order_number}",
                'intro' => "You've received a new order from {$this->order->customer_name}:",
                'paymentMethodLabel' => self::PAYMENT_METHOD_LABELS[$this->order->payment_method] ?? ucfirst($this->order->payment_method),
                'logoPath' => public_path('logo.png'),
                'logoUrl' => "{$frontendUrl}/logo.png",
                'orderUrl' => "{$frontendUrl}/thyaga-portal-admin/orders/",
            ],
        );
    }
}
