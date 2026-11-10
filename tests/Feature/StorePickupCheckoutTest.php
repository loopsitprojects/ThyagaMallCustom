<?php

namespace Tests\Feature;

use App\Mail\OrderConfirmation;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StorePickupCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function product(float $price = 1500): Product
    {
        return Product::create([
            'name' => 'Ceramic Mug', 'slug' => 'ceramic-mug', 'sku' => 'MUG-001',
            'regular_price' => $price, 'stock_quantity' => 10, 'is_active' => true,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function contactDetails(Product $product): array
    {
        return [
            'customer_name' => 'Nimali Silva', 'customer_email' => 'nimali@example.com', 'customer_phone' => '0771234567',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => 'cod',
        ];
    }

    public function test_pickup_order_needs_no_address_is_free_and_saves_the_store_location(): void
    {
        Mail::fake();
        config(['thyaga.pickup' => ['name' => 'Thyaga Mall Store', 'address' => '2A, Suleiman Terrace', 'city' => 'Colombo 05']]);

        $this->postJson('/api/orders', [...$this->contactDetails($this->product()), 'delivery_method' => 'pickup'])
            ->assertCreated()
            ->assertJsonPath('data.delivery_method', 'pickup')
            ->assertJsonPath('data.total', '1500.00');

        $this->assertDatabaseHas('orders', [
            'delivery_method' => 'pickup',
            'shipping_fee' => 0,
            'shipping_address' => 'Thyaga Mall Store, 2A, Suleiman Terrace',
            'shipping_city' => 'Colombo 05',
        ]);
        Mail::assertSent(OrderConfirmation::class, fn (OrderConfirmation $mail) => str_contains($mail->render(), 'Store pickup'));
    }

    public function test_pickup_ignores_any_address_the_browser_sends(): void
    {
        Mail::fake();

        $this->postJson('/api/orders', [
            ...$this->contactDetails($this->product()),
            'delivery_method' => 'pickup',
            'shipping_address' => '12 Galle Road',
            'shipping_city' => 'Galle',
        ])->assertCreated();

        $this->assertDatabaseMissing('orders', ['shipping_city' => 'Galle']);
    }

    public function test_home_delivery_still_requires_an_address_and_charges_shipping(): void
    {
        Mail::fake();
        $product = $this->product();

        $this->postJson('/api/orders', [...$this->contactDetails($product), 'delivery_method' => 'delivery'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['shipping_address', 'shipping_city']);

        $this->postJson('/api/orders', [
            ...$this->contactDetails($product),
            'shipping_address' => '12 Galle Road', 'shipping_city' => 'Galle',
        ])->assertCreated()->assertJsonPath('data.delivery_method', 'delivery');

        $this->assertDatabaseHas('orders', ['delivery_method' => 'delivery', 'shipping_fee' => 350, 'shipping_city' => 'Galle']);
    }

    public function test_unknown_delivery_method_is_rejected(): void
    {
        $this->postJson('/api/orders', [...$this->contactDetails($this->product()), 'delivery_method' => 'drone'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['delivery_method']);
    }
}
