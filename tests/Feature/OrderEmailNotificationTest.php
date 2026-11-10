<?php

namespace Tests\Feature;

use App\Mail\NewOrderPlaced;
use App\Mail\OrderConfirmation;
use App\Models\Admin;
use App\Models\Merchant;
use App\Models\Order;
use App\Models\OrderNotificationRecipient;
use App\Models\Product;
use App\Services\WebxpayService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OrderEmailNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function product(): Product
    {
        return Product::create([
            'name' => 'Wireless SOS Alarm', 'slug' => 'wireless-sos-alarm', 'sku' => '0015LS/006',
            'regular_price' => 4940, 'stock_quantity' => 10, 'is_active' => true,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function checkoutPayload(Product $product, string $paymentMethod = 'cod'): array
    {
        return [
            'customer_name' => 'Asreen Rameez', 'customer_email' => 'rameez@example.com', 'customer_phone' => '0777700311',
            'shipping_address' => '334 T B Jayah Mawatha', 'shipping_city' => 'Colombo', 'shipping_postal_code' => '01000',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => $paymentMethod,
        ];
    }

    private function adminToken(string $role): string
    {
        return Admin::create([
            'name' => 'Admin', 'email' => "{$role}@thyaga.lk", 'password' => Hash::make('admin-pass-123'),
            'role' => $role, 'status' => 'active',
        ])->createToken('admin-token', ['admin'])->plainTextToken;
    }

    public function test_cash_on_delivery_order_emails_every_active_recipient(): void
    {
        Mail::fake();
        OrderNotificationRecipient::create(['email' => 'orders@thyaga.lk']);
        OrderNotificationRecipient::create(['email' => 'owner@thyaga.lk']);
        OrderNotificationRecipient::create(['email' => 'paused@thyaga.lk', 'is_active' => false]);

        $this->postJson('/api/orders', $this->checkoutPayload($this->product()))->assertCreated();

        Mail::assertSent(NewOrderPlaced::class, 2);
        Mail::assertSent(NewOrderPlaced::class, fn (NewOrderPlaced $mail) => $mail->hasTo('orders@thyaga.lk'));
        Mail::assertSent(NewOrderPlaced::class, fn (NewOrderPlaced $mail) => $mail->hasTo('owner@thyaga.lk'));
        Mail::assertNotSent(NewOrderPlaced::class, fn (NewOrderPlaced $mail) => $mail->hasTo('paused@thyaga.lk'));
        Mail::assertSent(OrderConfirmation::class, fn (OrderConfirmation $mail) => $mail->hasTo('rameez@example.com'));
    }

    public function test_online_payment_order_is_not_emailed_until_the_payment_is_confirmed(): void
    {
        Mail::fake();
        OrderNotificationRecipient::create(['email' => 'orders@thyaga.lk']);

        $this->postJson('/api/orders', $this->checkoutPayload($this->product(), 'webxpay'))->assertCreated();

        Mail::assertNothingSent();
    }

    public function test_confirmed_webxpay_payment_emails_the_customer_and_the_recipients(): void
    {
        Mail::fake();
        OrderNotificationRecipient::create(['email' => 'orders@thyaga.lk']);
        $this->postJson('/api/orders', $this->checkoutPayload($this->product(), 'webxpay'))->assertCreated();
        $order = Order::firstOrFail();

        $this->mock(WebxpayService::class, function ($mock) use ($order) {
            $mock->shouldReceive('verifyCallback')->andReturn([
                'order_number' => $order->order_number, 'status' => 'success', 'is_valid' => true,
                'transaction_id' => 'TX-1', 'message' => 'ok',
            ]);
            $mock->shouldReceive('getFrontendRedirectUrl')->andReturn('https://example.com/order-success');
        });

        $this->post('/api/payment/webxpay/callback')->assertRedirect();

        Mail::assertSent(NewOrderPlaced::class, fn (NewOrderPlaced $mail) => $mail->order->is($order) && $mail->hasTo('orders@thyaga.lk'));
        Mail::assertSent(OrderConfirmation::class, fn (OrderConfirmation $mail) => $mail->order->is($order) && $mail->hasTo('rameez@example.com'));
    }

    public function test_new_order_email_lists_the_items_totals_merchant_and_address(): void
    {
        $merchant = Merchant::create(['name' => 'Living Styles', 'slug' => 'living-styles', 'code' => 'LS', 'status' => 'active']);
        $product = $this->product();
        $product->update(['merchant_id' => $merchant->id]);
        $this->postJson('/api/orders', $this->checkoutPayload($product))->assertCreated();

        $mail = new NewOrderPlaced(Order::firstOrFail());

        $mail->assertSeeInHtml('New order: #'.Order::first()->order_number);
        $mail->assertSeeInHtml('Wireless SOS Alarm');
        $mail->assertSeeInHtml('(#0015LS/006)');
        $mail->assertSeeInHtml('Rs.4,940.00');
        $mail->assertSeeInHtml('Free shipping');
        $mail->assertSeeInHtml('Cash on Delivery');
        $mail->assertSeeInHtml('Wireless SOS Alarm &mdash; Living Styles', false);
        $mail->assertSeeInHtml('334 T B Jayah Mawatha');
        $mail->assertHasReplyTo('rameez@example.com');
    }

    public function test_order_email_shows_the_order_time_in_sri_lanka_time(): void
    {
        $this->travelTo(Carbon::parse('2026-10-29 07:46:00', 'UTC'));
        $this->postJson('/api/orders', $this->checkoutPayload($this->product()))->assertCreated();

        $order = Order::firstOrFail();

        (new OrderConfirmation($order))->assertSeeInHtml('October 29, 2026 1:16 PM');
        $this->assertStringContainsString('THY-20261029-', $order->order_number);
    }

    public function test_customer_still_gets_a_confirmation_when_no_recipients_are_configured(): void
    {
        Mail::fake();

        $this->postJson('/api/orders', $this->checkoutPayload($this->product()))->assertCreated();

        Mail::assertSent(OrderConfirmation::class, 1);
        Mail::assertNotSent(NewOrderPlaced::class);
    }

    public function test_customer_confirmation_links_to_order_tracking_and_hides_merchant_and_sku(): void
    {
        $merchant = Merchant::create(['name' => 'Living Styles', 'slug' => 'living-styles', 'code' => 'LS', 'status' => 'active']);
        $product = $this->product();
        $product->update(['merchant_id' => $merchant->id]);
        $this->postJson('/api/orders', $this->checkoutPayload($product))->assertCreated();
        $order = Order::firstOrFail();

        $mail = new OrderConfirmation($order);

        $mail->assertHasSubject("Your Thyaga Mall order #{$order->order_number} has been received");
        $mail->assertSeeInHtml('Thank you for your order!');
        $mail->assertSeeInHtml('Wireless SOS Alarm');
        $mail->assertSeeInHtml('Rs.4,940.00');
        $mail->assertSeeInHtml("/track-order/?order_number={$order->order_number}");
        $mail->assertDontSeeInHtml('Living Styles');
        $mail->assertDontSeeInHtml('0015LS/006');
    }

    public function test_editors_get_403_on_email_settings(): void
    {
        $this->withToken($this->adminToken('editor'))->getJson('/api/admin/email-settings')->assertForbidden();
    }

    public function test_super_admin_adds_a_recipient_and_duplicates_are_rejected(): void
    {
        $token = $this->adminToken('super_admin');

        $this->withToken($token)->postJson('/api/admin/email-settings/recipients', ['email' => ' Orders@Thyaga.lk '])
            ->assertCreated()
            ->assertJsonPath('data.email', 'orders@thyaga.lk');

        $this->withToken($token)->postJson('/api/admin/email-settings/recipients', ['email' => 'orders@thyaga.lk'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'This email already receives order notifications.']);
    }
}
