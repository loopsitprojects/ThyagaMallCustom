<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Client for the Prompt Xpress courier tracking API.
 */
class PromptXpressService
{
    protected string $baseUrl;

    protected ?string $userId;

    protected ?string $password;

    protected int $timeout;

    protected int $cacheSeconds;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.promptxpress.base_url', 'https://api.promptxpress.net'), '/');
        $this->userId = config('services.promptxpress.user_id');
        $this->password = config('services.promptxpress.password');
        $this->timeout = (int) config('services.promptxpress.timeout', 10);
        $this->cacheSeconds = (int) config('services.promptxpress.cache_seconds', 60);
    }

    /**
     * Normalise a customer-entered tracking number (e.g. " rp 2475 0782 " to "RP24750782").
     * Returns null when the value cannot be a Prompt Xpress tracking number.
     */
    public static function normaliseTrackingNumber(string $input): ?string
    {
        $value = strtoupper((string) preg_replace('/\s+/', '', $input));

        return preg_match('/^[A-Z0-9]{6,20}$/', $value) === 1 ? $value : null;
    }

    /**
     * Full status history for a consignment, newest first. Returns an empty array when the
     * tracking number is unknown to Prompt Xpress.
     *
     * @return array<int, array{status: string, branch_name: string, status_date: string|null}>
     *
     * @throws RuntimeException When the courier API cannot be reached or returns an error.
     */
    public function getTrackingHistory(string $trackingNumber): array
    {
        return Cache::remember(
            "promptxpress:tracking:{$trackingNumber}",
            $this->cacheSeconds,
            fn (): array => $this->fetchTrackingHistory($trackingNumber),
        );
    }

    /**
     * @return array<int, array{status: string, branch_name: string, status_date: string|null}>
     */
    protected function fetchTrackingHistory(string $trackingNumber): array
    {
        try {
            $request = Http::acceptJson()->timeout($this->timeout);

            $token = $this->accessToken();
            if ($token !== null) {
                $request = $request->withToken($token);
            }

            $response = $request->get("{$this->baseUrl}/packagestatus/getpackagestatusAll/".rawurlencode($trackingNumber));
        } catch (ConnectionException $exception) {
            throw new RuntimeException('Prompt Xpress is unreachable.', previous: $exception);
        }

        if ($response->notFound()) {
            return [];
        }

        if ($response->failed()) {
            throw new RuntimeException("Prompt Xpress responded with status {$response->status()}.");
        }

        $body = $response->json();
        $items = is_array($body) && array_is_list($body) ? $body : (is_array($body) ? [$body] : []);

        $events = [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $status = is_string($item['status'] ?? null) ? $this->tidyStatus(trim($item['status'])) : '';
            if ($status === '') {
                continue;
            }

            $events[] = [
                'status' => $status,
                'branch_name' => is_string($item['branchName'] ?? null) ? trim($item['branchName']) : '',
                'status_date' => $this->toSriLankaIso($item['statusDate'] ?? null),
            ];
        }

        usort($events, fn (array $a, array $b): int => strtotime($b['status_date'] ?? '') <=> strtotime($a['status_date'] ?? ''));

        return $events;
    }

    /**
     * Bearer token for the API when credentials are configured, cached until shortly before it expires.
     */
    protected function accessToken(): ?string
    {
        if (blank($this->userId) || blank($this->password)) {
            return null;
        }

        $cached = Cache::get('promptxpress:access-token');
        if (is_string($cached)) {
            return $cached;
        }

        $response = Http::acceptJson()->timeout($this->timeout)->post("{$this->baseUrl}/login/authenticate", [
            'userId' => $this->userId,
            'password' => $this->password,
        ]);

        $token = $response->json('accessToken');
        if ($response->failed() || ! is_string($token) || $token === '') {
            Log::warning('Prompt Xpress authentication failed', ['status' => $response->status()]);

            return null;
        }

        Cache::put('promptxpress:access-token', $token, $this->tokenLifetimeSeconds($token));

        return $token;
    }

    /**
     * Seconds until one minute before the JWT expires (falls back to 25 minutes).
     */
    protected function tokenLifetimeSeconds(string $token): int
    {
        $payload = json_decode((string) base64_decode(strtr(explode('.', $token)[1] ?? '', '-_', '+/')), true);
        $expiresAt = is_array($payload) && is_int($payload['exp'] ?? null) ? $payload['exp'] : time() + 1500;

        return max(60, $expiresAt - time() - 60);
    }

    /**
     * Prompt Xpress returns Sri Lanka local time without an offset (e.g. "2026-11-13T18:31:37.373");
     * attach +05:30 so clients don't misread it as UTC or their own time zone.
     */
    protected function toSriLankaIso(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $value = trim($value);
        $hasZone = preg_match('/([zZ]|[+-]\d{2}:?\d{2})$/', $value) === 1;
        $iso = $hasZone ? $value : $value.'+05:30';

        return strtotime($iso) === false ? $value : $iso;
    }

    /**
     * Fix known spelling mistakes in courier status text.
     */
    protected function tidyStatus(string $status): string
    {
        return (string) preg_replace_callback(
            '/\brecieved\b/i',
            fn (array $match): string => $match[0][0] === 'R' ? 'Received' : 'received',
            $status,
        );
    }
}
