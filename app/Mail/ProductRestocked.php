<?php

namespace App\Mail;

use App\Models\Product;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Tells a shopper that a product they asked about is back in stock.
 */
class ProductRestocked extends Mailable
{
    public function __construct(public Product $product) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Back in stock: {$this->product->name}",
        );
    }

    public function content(): Content
    {
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $image = $this->product->primary_image;

        return new Content(
            view: 'emails.product-restocked',
            with: [
                'logoPath' => public_path('logo.png'),
                'logoUrl' => "{$frontendUrl}/logo.png",
                'productUrl' => "{$frontendUrl}/product/".rawurlencode($this->product->slug).'/',
                'imageUrl' => str_starts_with((string) $image, 'http') ? $image : $frontendUrl.'/'.ltrim((string) $image, '/'),
                'price' => (float) ($this->product->sale_price ?: $this->product->regular_price),
            ],
        );
    }
}
