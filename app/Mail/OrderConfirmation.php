<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Order receipt sent to the customer who placed the order.
 */
class OrderConfirmation extends Mailable
{
    public function __construct(public Order $order)
    {
        $this->order->loadMissing('items');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your '.config('app.name')." order #{$this->order->order_number} has been received",
        );
    }

    public function content(): Content
    {
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');

        return new Content(
            view: 'emails.order',
            with: [
                'isStoreCopy' => false,
                'heading' => 'Thank you for your order!',
                'intro' => "Hi {$this->order->customer_name}, we've received your order and are getting it ready. Here are the details:",
                'paymentMethodLabel' => NewOrderPlaced::PAYMENT_METHOD_LABELS[$this->order->payment_method] ?? ucfirst($this->order->payment_method),
                'logoPath' => public_path('logo.png'),
                'logoUrl' => "{$frontendUrl}/logo.png",
                'orderUrl' => "{$frontendUrl}/track-order/?order_number=".urlencode($this->order->order_number),
            ],
        );
    }
}
