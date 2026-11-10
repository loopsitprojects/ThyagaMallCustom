<?php

namespace App\Jobs;

use App\Mail\ProductRestocked;
use App\Models\Product;
use App\Models\RestockRequest;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Tells everyone waiting on a product that it's available again.
 *
 * Dispatched with dispatchAfterResponse() so the admin never waits on SMTP,
 * and the hosting doesn't need a queue worker.
 */
class SendRestockEmails
{
    use Dispatchable;

    public function __construct(public Product $product) {}

    public function handle(): void
    {
        RestockRequest::where('product_id', $this->product->id)
            ->waiting()
            ->chunkById(100, function ($requests) {
                foreach ($requests as $request) {
                    $this->send($request);
                }
            });
    }

    /**
     * Only a successful send is marked as notified. A failed email is logged,
     * stays waiting and never stops the remaining ones.
     */
    private function send(RestockRequest $request): void
    {
        try {
            Mail::to($request->email)->send(new ProductRestocked($this->product));
            $request->update(['notified_at' => now()]);
        } catch (Throwable $exception) {
            Log::error('Restock email failed', [
                'product_id' => $this->product->id,
                'recipient' => $request->email,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
