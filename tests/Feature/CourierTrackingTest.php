<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CourierTrackingTest extends TestCase
{
    private const HISTORY_URL = 'api.promptxpress.net/packagestatus/getpackagestatusAll/RP24750782';

    /**
     * Status history in the exact shape Prompt Xpress returns (oldest first, no time-zone offset).
     *
     * @return array<int, array<string, string>>
     */
    private function courierHistory(): array
    {
        return [
            ['trackingNo' => 'RP24750782', 'branchName' => 'Panchikawatta', 'status' => 'Consignment Recieved', 'statusDate' => '2026-11-13T18:31:37.373'],
            ['trackingNo' => 'RP24750782', 'branchName' => 'Panchikawatta', 'status' => 'In Transit', 'statusDate' => '2026-11-13T19:29:48'],
            ['trackingNo' => 'RP24750782', 'branchName' => 'Head Office', 'status' => 'In Transit', 'statusDate' => '2026-11-14T01:38:16'],
        ];
    }

    public function test_it_returns_the_delivery_history_newest_first_in_sri_lanka_time(): void
    {
        Http::preventStrayRequests();
        Http::fake([self::HISTORY_URL => Http::response($this->courierHistory())]);

        $this->getJson('/api/tracking/RP24750782')
            ->assertOk()
            ->assertExactJson([
                'success' => true,
                'data' => [
                    'tracking_number' => 'RP24750782',
                    'courier' => 'Prompt Xpress',
                    'events' => [
                        ['status' => 'In Transit', 'branch_name' => 'Head Office', 'status_date' => '2026-11-14T01:38:16+05:30'],
                        ['status' => 'In Transit', 'branch_name' => 'Panchikawatta', 'status_date' => '2026-11-13T19:29:48+05:30'],
                        ['status' => 'Consignment Received', 'branch_name' => 'Panchikawatta', 'status_date' => '2026-11-13T18:31:37.373+05:30'],
                    ],
                ],
            ]);
    }

    public function test_it_normalises_the_tracking_number_before_calling_the_courier(): void
    {
        Http::preventStrayRequests();
        Http::fake([self::HISTORY_URL => Http::response($this->courierHistory())]);

        $this->getJson('/api/tracking/rp24750782')
            ->assertOk()
            ->assertJsonPath('data.tracking_number', 'RP24750782');

        Http::assertSent(fn (Request $request): bool => str_ends_with($request->url(), '/getpackagestatusAll/RP24750782'));
    }

    public function test_it_rejects_an_invalid_tracking_number_without_calling_the_courier(): void
    {
        Http::preventStrayRequests();
        Http::fake();

        $this->getJson('/api/tracking/RP-1')
            ->assertUnprocessable()
            ->assertJsonPath('success', false);

        Http::assertNothingSent();
    }

    public function test_it_returns_not_found_when_the_courier_does_not_know_the_number(): void
    {
        Http::preventStrayRequests();
        Http::fake(['api.promptxpress.net/packagestatus/getpackagestatusAll/XX00000000' => Http::response(['title' => 'Not Found'], 404)]);

        $this->getJson('/api/tracking/XX00000000')
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_it_returns_bad_gateway_when_the_courier_api_fails(): void
    {
        Http::preventStrayRequests();
        Http::fake([self::HISTORY_URL => Http::response('Server error', 500)]);

        $this->getJson('/api/tracking/RP24750782')
            ->assertStatus(502)
            ->assertJsonPath('success', false);
    }

    public function test_it_caches_lookups_so_repeat_requests_do_not_call_the_courier_again(): void
    {
        Http::preventStrayRequests();
        Http::fake([self::HISTORY_URL => Http::response($this->courierHistory())]);

        $this->getJson('/api/tracking/RP24750782')->assertOk();
        $this->getJson('/api/tracking/RP24750782')->assertOk();

        Http::assertSentCount(1);
    }

    public function test_it_authenticates_with_the_courier_when_credentials_are_configured(): void
    {
        config([
            'services.promptxpress.user_id' => 'thyaga-api',
            'services.promptxpress.password' => 'secret',
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'api.promptxpress.net/login/authenticate' => Http::response(['accessToken' => 'courier-token']),
            self::HISTORY_URL => Http::response($this->courierHistory()),
        ]);

        $this->getJson('/api/tracking/RP24750782')->assertOk();

        Http::assertSent(fn (Request $request): bool => str_contains($request->url(), '/getpackagestatusAll/')
            && $request->hasHeader('Authorization', 'Bearer courier-token'));
    }

    public function test_it_rate_limits_tracking_lookups(): void
    {
        Http::preventStrayRequests();
        Http::fake([self::HISTORY_URL => Http::response($this->courierHistory())]);

        for ($attempt = 0; $attempt < 30; $attempt++) {
            $this->getJson('/api/tracking/RP24750782')->assertOk();
        }

        $this->getJson('/api/tracking/RP24750782')->assertTooManyRequests();
    }
}
