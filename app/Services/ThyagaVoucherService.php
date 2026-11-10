<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ThyagaVoucherService
{
    protected string $mode;

    protected string $apiKey;

    protected string $baseUrl;

    protected int $timeout;

    /**
     * Standard error code translations from Thyāga specification
     */
    protected const ERROR_MESSAGES = [
        'VOUCHER_NOT_FOUND' => 'Thyāga voucher not found. Please check your code.',
        'INVALID_VOUCHER_ID' => 'Thyāga voucher not found. Please check your code.',
        'MERCHANT_NOT_IN_VOUCHER' => 'This voucher is not eligible for use on this store.',
        'EXPIRED' => 'This Thyāga voucher has expired.',
        'INSUFFICIENT_FUNDS_IN_VOUCHER' => 'Insufficient balance on this voucher.',
        'INVALID_OTP' => 'Invalid OTP entered. Please try again.',
        'INVALID_REDEMPTION_AMOUNT' => 'Please enter a valid redemption amount.',
        'CANCELLED' => 'The voucher reservation has expired. Please retry.',
        'GYF_INACTIVE' => 'This voucher is currently inactive. Contact support.',
    ];

    public function __construct()
    {
        $this->mode = config('thyaga.mode', 'live');
        $this->apiKey = config('thyaga.api_key', '');
        $endpoints = config('thyaga.endpoints', []);

        $rawUrl = $this->mode === 'live'
            ? ($endpoints['live'] ?? '')
            : ($endpoints['sandbox'] ?? '');

        // Ensure trailing slash when configured
        $this->baseUrl = ! empty($rawUrl) ? rtrim($rawUrl, '/').'/' : '';
        $this->timeout = config('thyaga.timeout', 15);
    }

    /**
     * Check if the API key and base URL are configured
     */
    public function isConfigured(): bool
    {
        return ! empty($this->apiKey) && ! empty($this->baseUrl);
    }

    /**
     * Execute an HTTP request to the Thyāga Redemption API
     */
    protected function request(string $endpoint, string $method = 'GET', array $data = []): array
    {
        if (! $this->isConfigured()) {
            throw new Exception('Thyāga API Key is not configured in backend settings (.env).');
        }

        $url = $this->baseUrl.ltrim($endpoint, '/');

        try {
            $client = Http::withHeaders([
                'x-auth-api-key' => $this->apiKey,
                'Content-Type' => 'application/json; charset=utf-8',
                'Accept' => 'application/json',
            ])->timeout($this->timeout);

            $response = match (strtoupper($method)) {
                'POST' => $client->post($url, empty($data) ? (object) [] : $data),
                'PUT' => $client->put($url, $data),
                'DELETE' => $client->delete($url, $data),
                default => $client->get($url, $data),
            };

            $statusCode = $response->status();
            $body = $response->json();

            Log::debug('Thyāga API Response', [
                'endpoint' => $endpoint,
                'method' => $method,
                'status' => $statusCode,
                'body' => $body,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'status_code' => $statusCode,
                    'data' => $body,
                ];
            }

            // Extract error message
            $errorCode = $body['code'] ?? $body['message'] ?? $body['error'] ?? 'UNKNOWN_ERROR';
            $userMessage = self::ERROR_MESSAGES[$errorCode]
                ?? ($body['message'] ?? $body['error'] ?? "Thyāga request failed (HTTP {$statusCode})");

            return [
                'success' => false,
                'status_code' => $statusCode,
                'error_code' => $errorCode,
                'message' => $userMessage,
                'raw' => $body,
            ];
        } catch (Exception $e) {
            Log::error('Thyāga API Connection Exception', [
                'endpoint' => $endpoint,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'status_code' => 500,
                'error_code' => 'CONNECTION_ERROR',
                'message' => 'Unable to connect to Thyāga voucher network. Please try again.',
            ];
        }
    }

    /**
     * 1. Healthcheck / Test API Key (GET get-offers)
     */
    public function healthCheck(): array
    {
        return $this->request('get-offers', 'GET');
    }

    /**
     * 2. Look up voucher details & balance (GET getVoucherDetails/{voucherCode})
     */
    public function getVoucherDetails(string $voucherCode): array
    {
        $code = trim($voucherCode);
        $result = $this->request('getVoucherDetails/'.rawurlencode($code), 'GET');

        if (! $result['success']) {
            return $result;
        }

        $data = $result['data'] ?? [];
        $status = strtolower($data['status'] ?? '');
        $amount = (float) ($data['amount'] ?? 0);

        if ($status === 'expired') {
            return [
                'success' => false,
                'status_code' => 400,
                'error_code' => 'EXPIRED',
                'message' => 'This Thyāga voucher has expired.',
                'data' => $data,
            ];
        }

        if ($status !== 'active') {
            return [
                'success' => false,
                'status_code' => 400,
                'error_code' => 'GYF_INACTIVE',
                'message' => 'This voucher is currently inactive or cannot be redeemed.',
                'data' => $data,
            ];
        }

        if ($amount <= 0) {
            return [
                'success' => false,
                'status_code' => 400,
                'error_code' => 'INSUFFICIENT_FUNDS_IN_VOUCHER',
                'message' => 'This Thyāga voucher has no remaining balance.',
                'data' => $data,
            ];
        }

        // Mask phone number for UI display
        $maskedPhone = $this->maskPhone($data['ownerMobile'] ?? '');

        return [
            'success' => true,
            'status_code' => 200,
            'data' => [
                'id' => $data['id'] ?? $code,
                'code' => $code,
                'ownerName' => $data['ownerName'] ?? 'Valued Customer',
                'ownerMobile' => $data['ownerMobile'] ?? '',
                'maskedPhone' => $maskedPhone,
                'amount' => $amount,
                'expiryDate' => $data['expiryDate'] ?? null,
                'status' => $data['status'] ?? 'active',
            ],
            'message' => 'Thyāga voucher verified successfully.',
        ];
    }

    /**
     * 3. Initiate Redemption (Trigger SMS OTP) (POST initiate-redemption)
     */
    public function initiateRedemption(string $voucherId, float $amount): array
    {
        if ($amount <= 0) {
            return [
                'success' => false,
                'status_code' => 400,
                'error_code' => 'INVALID_REDEMPTION_AMOUNT',
                'message' => 'Please enter a valid redemption amount greater than 0.',
            ];
        }

        $result = $this->request('initiate-redemption', 'POST', [
            'voucherId' => $voucherId,
            'amount' => round($amount, 2),
        ]);

        if (! $result['success']) {
            return $result;
        }

        $redemptionId = $result['data']['redemptionId'] ?? null;
        if (! $redemptionId) {
            return [
                'success' => false,
                'status_code' => 500,
                'message' => 'Failed to obtain redemption reference from Thyāga.',
            ];
        }

        return [
            'success' => true,
            'status_code' => 200,
            'data' => [
                'redemptionId' => $redemptionId,
                'status' => $result['data']['status'] ?? 'INITIATED',
            ],
            'message' => 'SMS verification code sent to the voucher owner.',
        ];
    }

    /**
     * 4. Verify OTP & Put Funds On-Hold (POST on-hold-redemption)
     */
    public function verifyOtpAndHold(string $redemptionId, float $amount, string $otp): array
    {
        $cleanOtp = preg_replace('/[^\d]/', '', trim($otp));
        if (strlen($cleanOtp) < 4) {
            return [
                'success' => false,
                'status_code' => 400,
                'error_code' => 'INVALID_OTP',
                'message' => 'Please enter a valid 6-digit OTP code.',
            ];
        }

        $result = $this->request('on-hold-redemption', 'POST', [
            'redemptionId' => $redemptionId,
            'amount' => round($amount, 2),
            'otp' => (string) $cleanOtp,
        ]);

        if (! $result['success']) {
            return $result;
        }

        $status = strtoupper($result['data']['status'] ?? '');
        if ($status !== 'PROCESSING' && $status !== 'OK' && $status !== 'SUCCESS') {
            return [
                'success' => false,
                'status_code' => 400,
                'message' => $result['data']['message'] ?? 'Could not place voucher funds on hold.',
            ];
        }

        return [
            'success' => true,
            'status_code' => 200,
            'data' => [
                'redemptionId' => $redemptionId,
                'status' => 'PROCESSING',
                'amount' => round($amount, 2),
            ],
            'message' => 'Redemption placed on hold successfully. Discount applied!',
        ];
    }

    /**
     * 5. Validate Hold Status Before Order Submission (GET {redemptionId}/validateStatus)
     */
    public function validateHoldStatus(string $redemptionId): bool
    {
        try {
            $result = $this->request(rawurlencode($redemptionId).'/validateStatus', 'GET');
            if ($result['success']) {
                $status = strtoupper($result['data']['status'] ?? '');

                return $status === 'OK' || $status === 'PROCESSING';
            }
        } catch (\Throwable $e) {
            Log::error('Thyāga validateHoldStatus failed: '.$e->getMessage());
        }

        return false;
    }

    /**
     * 6. Complete Redemption (Burn Voucher) (POST complete-redemption)
     */
    public function completeRedemption(string $redemptionId, string $orderReference): array
    {
        $result = $this->request('complete-redemption', 'POST', [
            'redemptionId' => $redemptionId,
            'referenceCode' => (string) $orderReference,
        ]);

        Log::info('Thyāga completeRedemption executed', [
            'redemption_id' => $redemptionId,
            'order_reference' => $orderReference,
            'result' => $result,
        ]);

        return $result;
    }

    /**
     * 7. Cancel / Release Redemption (POST cancel-redemption/{redemptionId})
     */
    public function cancelRedemption(string $redemptionId): array
    {
        $result = $this->request('cancel-redemption/'.rawurlencode($redemptionId), 'POST', []);

        Log::info('Thyāga cancelRedemption executed', [
            'redemption_id' => $redemptionId,
            'result' => $result,
        ]);

        return $result;
    }

    /**
     * Helper to mask phone numbers (e.g. 0771234567 -> 0771****4567)
     */
    public function maskPhone(?string $phone): string
    {
        if (! $phone) {
            return '';
        }
        $clean = preg_replace('/[^\d]/', '', $phone);
        $len = strlen($clean);

        if ($len >= 10) {
            return substr($clean, 0, 4).'****'.substr($clean, -3);
        }
        if ($len >= 7) {
            return substr($clean, 0, 3).'***'.substr($clean, -2);
        }

        return $phone;
    }
}
