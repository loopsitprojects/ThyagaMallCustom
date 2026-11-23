<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ThyagaVoucherHold;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ThyagaVoucherHoldTest extends TestCase
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
        Http::preventStrayRequests();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function fakeThyaga(array $overrides = []): void
    {
        Http::fake($overrides + [
            self::API.'on-hold-redemption' => Http::response(['status' => 'PROCESSING']),
            self::API.'*/validateStatus' => Http::response(['status' => 'PROCESSING']),
            self::API.'complete-redemption' => Http::response(['status' => 'COMPLETED']),
            self::API.'cancel-redemption/*' => Http::response(['status' => 'CANCELLED']),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function orderPayload(string $redemptionId): array
    {
        $product = Product::create([
            'name' => 'Ceramic Mug', 'slug' => 'ceramic-mug-'.uniqid(), 'sku' => 'MUG-'.uniqid(),
            'regular_price' => 4000, 'stock_quantity' => 10, 'is_active' => true,
        ]);

        return [
            'customer_name' => 'Nimali Silva', 'customer_email' => 'nimali@example.com', 'customer_phone' => '0771234567',
            'shipping_address' => '12 Galle Road', 'shipping_city' => 'Colombo',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'voucher_redemption_id' => $redemptionId,
            'payment_method' => 'voucher_cod',
        ];
    }

    public function test_verified_hold_can_be_restored_after_a_checkout_refresh(): void
    {
        $this->fakeThyaga();

        $this->postJson('/api/vouchers/thyaga/verify-otp', [
            'redemption_id' => 'RED-1', 'amount' => 1000, 'otp' => '123456', 'voucher_code' => '09297673zw',
        ])->assertOk();

        $this->getJson('/api/vouchers/thyaga/hold/RED-1')
            ->assertOk()
            ->assertJsonPath('data.amount', 1000)
            ->assertJsonPath('data.voucher_code', '09297673ZW');
    }

    public function test_hold_cannot_be_restored_once_used_expired_or_unknown_to_thyaga(): void
    {
        $this->fakeThyaga([self::API.'RED-GONE/validateStatus' => Http::response(['status' => 'CANCELLED'])]);
        $used = ThyagaVoucherHold::factory()->create(['status' => ThyagaVoucherHold::STATUS_USED]);
        $expired = ThyagaVoucherHold::factory()->expired()->create();
        ThyagaVoucherHold::factory()->create(['redemption_id' => 'RED-GONE']);

        $this->getJson("/api/vouchers/thyaga/hold/{$used->redemption_id}")->assertNotFound();
        $this->getJson("/api/vouchers/thyaga/hold/{$expired->redemption_id}")->assertNotFound();
        $this->getJson('/api/vouchers/thyaga/hold/RED-GONE')->assertNotFound();
    }

    public function test_order_marks_the_hold_used_so_it_is_never_released(): void
    {
        $this->fakeThyaga();
        $hold = ThyagaVoucherHold::factory()->create(['redemption_id' => 'RED-1']);

        $this->postJson('/api/orders', $this->orderPayload('RED-1'))->assertCreated();

        $hold->refresh();
        $this->assertSame(ThyagaVoucherHold::STATUS_USED, $hold->status);
        $this->assertTrue($hold->order->is(Order::firstOrFail()));
    }

    public function test_expired_hold_cannot_be_used_for_an_order(): void
    {
        $this->fakeThyaga();
        ThyagaVoucherHold::factory()->expired()->create(['redemption_id' => 'RED-1']);

        $this->postJson('/api/orders', $this->orderPayload('RED-1'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['voucher_redemption_id']);
    }

    public function test_scheduled_release_gives_unused_expired_holds_back_to_the_voucher(): void
    {
        $this->fakeThyaga();
        $abandoned = ThyagaVoucherHold::factory()->expired()->create();
        $stillUsable = ThyagaVoucherHold::factory()->create();
        $usedByOrder = ThyagaVoucherHold::factory()->expired()->create(['status' => ThyagaVoucherHold::STATUS_USED]);

        $this->artisan('thyaga:release-expired-holds')->assertSuccessful();

        Http::assertSentCount(1);
        Http::assertSent(fn (Request $request): bool => $request->url() === self::API.'cancel-redemption/'.$abandoned->redemption_id);
        $this->assertSame(ThyagaVoucherHold::STATUS_RELEASED, $abandoned->fresh()->status);
        $this->assertNotNull($abandoned->fresh()->released_at);
        $this->assertSame(ThyagaVoucherHold::STATUS_HELD, $stillUsable->fresh()->status);
        $this->assertSame(ThyagaVoucherHold::STATUS_USED, $usedByOrder->fresh()->status);
    }

    public function test_hold_thyaga_already_cancelled_counts_as_released(): void
    {
        $this->fakeThyaga([self::API.'cancel-redemption/*' => Http::response(['status' => 400, 'detail' => 'CANCELLED'], 400)]);
        $hold = ThyagaVoucherHold::factory()->expired()->create();

        $this->artisan('thyaga:release-expired-holds')->assertSuccessful();

        $this->assertSame(ThyagaVoucherHold::STATUS_RELEASED, $hold->fresh()->status);
    }

    public function test_failed_release_is_retried_then_given_up_after_too_many_attempts(): void
    {
        $this->fakeThyaga([self::API.'cancel-redemption/*' => Http::response(['detail' => 'SERVER_ERROR'], 500)]);
        $hold = ThyagaVoucherHold::factory()->expired()->create();

        $this->artisan('thyaga:release-expired-holds')->assertSuccessful();
        $this->assertSame(ThyagaVoucherHold::STATUS_HELD, $hold->fresh()->status);
        $this->assertSame(1, $hold->fresh()->release_attempts);

        for ($run = 2; $run <= ThyagaVoucherHold::MAX_RELEASE_ATTEMPTS; $run++) {
            $this->artisan('thyaga:release-expired-holds')->assertSuccessful();
        }

        $this->assertSame(ThyagaVoucherHold::STATUS_RELEASE_FAILED, $hold->fresh()->status);
    }

    public function test_customer_releasing_the_voucher_marks_the_hold_released(): void
    {
        $this->fakeThyaga();
        $hold = ThyagaVoucherHold::factory()->create(['redemption_id' => 'RED-1']);

        $this->postJson('/api/vouchers/thyaga/cancel', ['redemption_id' => 'RED-1'])->assertOk();

        $this->assertSame(ThyagaVoucherHold::STATUS_RELEASED, $hold->fresh()->status);
        $this->artisan('thyaga:release-expired-holds')->assertSuccessful();
        Http::assertSentCount(1);
    }
}
