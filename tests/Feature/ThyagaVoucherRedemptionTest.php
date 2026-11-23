<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Services\WebxpayService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ThyagaVoucherRedemptionTest extends TestCase
{
    use RefreshDatabase;

    private const API = 'https://thyaga.test/v1.0/app/plugin/redemption/';

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
        config([
            'thyaga.mode' => 'live',
            'thyaga.api_key' => 'test-key',
            'thyaga.endpoints.live' => self::API,
        ]);
    }

    private function product(): Product
    {
        return Product::create([
            'name' => 'Ceramic Mug', 'slug' => 'ceramic-mug', 'sku' => 'MUG-001',
            'regular_price' => 4000, 'stock_quantity' => 10, 'is_active' => true,
        ]);
    }

    /**
     * Thyāga's API for one voucher worth Rs. 1,000 whose hold is valid.
     *
     * @param  array<string, mixed>  $overrides
     */
    private function fakeThyaga(array $overrides = []): void
    {
        Http::preventStrayRequests();
        Http::fake($overrides + [
            self::API.'getVoucherDetails/*' => Http::response([
                'id' => 'VCH-1', 'ownerName' => 'Nimali Silva', 'ownerMobile' => '0771234567',
                'amount' => 1000, 'expiryDate' => '2027-05-09T18:28:59Z', 'status' => 'active',
            ]),
            self::API.'initiate-redemption' => Http::response(['redemptionId' => 'RED-1', 'status' => 'INITIATED']),
            self::API.'on-hold-redemption' => Http::response(['status' => 'PROCESSING']),
            self::API.'RED-1/validateStatus' => Http::response(['status' => 'PROCESSING']),
            self::API.'complete-redemption' => Http::response(['status' => 'COMPLETED']),
            self::API.'cancel-redemption/*' => Http::response(['status' => 'CANCELLED']),
        ]);
    }

    /**
     * Look up the voucher, send the OTP and hold Rs. 1,000, as the checkout page does.
     */
    private function holdVoucher(): void
    {
        $this->getJson('/api/vouchers/thyaga/details/09297673ZW')->assertOk();
        $this->postJson('/api/vouchers/thyaga/initiate', ['voucher_id' => 'VCH-1', 'amount' => 1000])->assertOk();
        $this->postJson('/api/vouchers/thyaga/verify-otp', ['redemption_id' => 'RED-1', 'amount' => 1000, 'otp' => '123456'])->assertOk();
    }

    /**
     * @return array<string, mixed>
     */
    private function orderPayload(Product $product, string $paymentMethod, string $redemptionId = 'RED-1'): array
    {
        return [
            'customer_name' => 'Nimali Silva', 'customer_email' => 'nimali@example.com', 'customer_phone' => '0771234567',
            'shipping_address' => '12 Galle Road', 'shipping_city' => 'Colombo',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'voucher_code' => '09297673ZW',
            'voucher_redemption_id' => $redemptionId,
            'voucher_amount' => 99999,
            'payment_method' => $paymentMethod,
        ];
    }

    private function fakeWebxpayCallback(Order $order, string $status, bool $isSigned): void
    {
        $this->mock(WebxpayService::class, function ($mock) use ($order, $status, $isSigned) {
            $mock->shouldReceive('verifyCallback')->andReturn([
                'order_number' => $order->order_number, 'status' => $status, 'is_valid' => $status === 'success',
                'is_signed' => $isSigned, 'transaction_id' => 'TX-1', 'message' => $status,
            ]);
            $mock->shouldReceive('getFrontendRedirectUrl')->andReturn('https://example.com/return');
        });
    }

    public function test_voucher_lookup_shows_the_balance_but_never_the_owners_full_phone_number(): void
    {
        $this->fakeThyaga();

        $this->getJson('/api/vouchers/thyaga/details/09297673ZW')
            ->assertOk()
            ->assertJsonPath('data.amount', 1000)
            ->assertJsonPath('data.maskedPhone', '0771****567')
            ->assertJsonMissingPath('data.ownerMobile');
    }

    public function test_thyaga_error_codes_are_shown_as_friendly_messages(): void
    {
        $this->fakeThyaga([
            self::API.'getVoucherDetails/*' => Http::response(['title' => 'Bad Request', 'status' => 400, 'detail' => 'VOUCHER_NOT_FOUND'], 400),
            self::API.'on-hold-redemption' => Http::response(['title' => 'Bad Request', 'status' => 400, 'detail' => 'INVALID_OTP'], 400),
        ]);

        $this->getJson('/api/vouchers/thyaga/details/ZZ00000000')
            ->assertStatus(400)
            ->assertJsonPath('error_code', 'VOUCHER_NOT_FOUND')
            ->assertJsonPath('message', 'Thyāga voucher not found. Please check your code.');

        $this->postJson('/api/vouchers/thyaga/verify-otp', ['redemption_id' => 'RED-1', 'amount' => 1000, 'otp' => '000000'])
            ->assertStatus(400)
            ->assertJsonPath('message', 'Invalid OTP entered. Please try again.');
    }

    public function test_cash_on_delivery_order_uses_the_held_amount_and_redeems_the_voucher(): void
    {
        $this->fakeThyaga();
        $this->holdVoucher();

        $this->postJson('/api/orders', $this->orderPayload($this->product(), 'voucher_cod'))
            ->assertCreated()
            ->assertJsonPath('data.discount', '1000.00')
            ->assertJsonPath('data.total', '3000.00');

        $order = Order::firstOrFail();
        Http::assertSent(fn (Request $request): bool => $request->url() === self::API.'complete-redemption'
            && $request['redemptionId'] === 'RED-1'
            && $request['referenceCode'] === $order->order_number);
    }

    public function test_order_is_rejected_for_a_redemption_this_server_never_verified(): void
    {
        $this->fakeThyaga();

        $this->postJson('/api/orders', $this->orderPayload($this->product(), 'cod', 'RED-FORGED'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['voucher_redemption_id']);

        $this->assertDatabaseCount('orders', 0);
        Http::assertNotSent(fn (Request $request): bool => str_contains($request->url(), 'complete-redemption'));
    }

    public function test_a_voucher_hold_can_only_be_used_for_one_order(): void
    {
        $this->fakeThyaga();
        $this->holdVoucher();
        $product = $this->product();

        $this->postJson('/api/orders', $this->orderPayload($product, 'voucher_cod'))->assertCreated();
        $this->postJson('/api/orders', $this->orderPayload($product, 'voucher_cod'))->assertUnprocessable();

        $this->assertDatabaseCount('orders', 1);
    }

    public function test_card_order_redeems_the_voucher_only_after_the_payment_is_confirmed(): void
    {
        $this->fakeThyaga();
        $this->holdVoucher();
        $this->postJson('/api/orders', $this->orderPayload($this->product(), 'webxpay'))->assertCreated();
        Http::assertNotSent(fn (Request $request): bool => str_contains($request->url(), 'complete-redemption'));

        $this->fakeWebxpayCallback(Order::firstOrFail(), 'success', true);
        $this->post('/api/payment/webxpay/callback')->assertRedirect();

        Http::assertSent(fn (Request $request): bool => $request->url() === self::API.'complete-redemption');
    }

    public function test_failed_card_payment_releases_the_voucher_hold(): void
    {
        $this->fakeThyaga();
        $this->holdVoucher();
        $this->postJson('/api/orders', $this->orderPayload($this->product(), 'webxpay'))->assertCreated();

        $this->fakeWebxpayCallback(Order::firstOrFail(), 'failed', true);
        $this->post('/api/payment/webxpay/callback')->assertRedirect();

        Http::assertSent(fn (Request $request): bool => $request->url() === self::API.'cancel-redemption/RED-1');
        Http::assertNotSent(fn (Request $request): bool => str_contains($request->url(), 'complete-redemption'));
        $this->assertStringContainsString('hold released', (string) Order::firstOrFail()->notes);
    }

    public function test_unsigned_failure_callback_cannot_release_the_voucher_hold(): void
    {
        $this->fakeThyaga();
        $this->holdVoucher();
        $this->postJson('/api/orders', $this->orderPayload($this->product(), 'webxpay'))->assertCreated();

        $this->fakeWebxpayCallback(Order::firstOrFail(), 'failed', false);
        $this->post('/api/payment/webxpay/callback')->assertRedirect();

        Http::assertNotSent(fn (Request $request): bool => str_contains($request->url(), 'cancel-redemption'));
    }

    public function test_order_is_flagged_when_thyaga_refuses_to_redeem_the_voucher(): void
    {
        $this->fakeThyaga([
            self::API.'complete-redemption' => Http::response(['status' => 400, 'detail' => 'CANCELLED'], 400),
        ]);
        $this->holdVoucher();

        $this->postJson('/api/orders', $this->orderPayload($this->product(), 'voucher_cod'))->assertCreated();

        $this->assertStringContainsString('Thyāga voucher NOT redeemed (CANCELLED)', (string) Order::firstOrFail()->notes);
    }
}
