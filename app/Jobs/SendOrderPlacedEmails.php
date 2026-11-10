<?php

namespace App\Jobs;

use App\Mail\NewOrderPlaced;
use App\Mail\OrderConfirmation;
use App\Models\Order;
use App\Models\OrderNotificationRecipient;
use Illuminate\Contracts\Mail\Mailable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Sends the customer their order confirmation and alerts every active
 * notification recipient about the new order.
 *
 * Dispatched with dispatchAfterResponse() so the customer never waits on SMTP,
 * and the hosting doesn't need a queue worker.
 */
class SendOrderPlacedEmails
{
    use Dispatchable;

    public function __construct(public Order $order) {}

    public function handle(): void
    {
        $this->send($this->order->customer_email, new OrderConfirmation($this->order));

        foreach (OrderNotificationRecipient::active()->pluck('email') as $email) {
            $this->send($email, new NewOrderPlaced($this->order));
        }
    }

    /**
     * A failed email is logged and never stops the remaining ones.
     */
    private function send(string $email, Mailable $mailable): void
    {
        try {
            Mail::to($email)->send($mailable);
        } catch (Throwable $exception) {
            Log::error('Order email failed', [
                'order_number' => $this->order->order_number,
                'mail' => class_basename($mailable),
                'recipient' => $email,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
