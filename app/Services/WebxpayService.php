<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebxpayService
{
    protected string $mode;

    protected string $checkoutUrl;

    protected string $merchantId;

    protected string $secretKey;

    protected string $publicKey;

    protected string $apiUsername;

    protected string $apiPassword;

    protected string $currency;

    protected ?string $returnUrl;

    protected string $frontendUrl;

    public function __construct()
    {
        $this->mode = config('webxpay.mode', 'sandbox');
        $endpoints = config('webxpay.endpoints', []);
        $this->checkoutUrl = $this->mode === 'live'
            ? ($endpoints['live'] ?? 'https://webxpay.com/index.php?route=checkout/billing')
            : ($endpoints['sandbox'] ?? 'https://stagingxpay.info/index.php?route=checkout/billing');

        $this->merchantId = config('webxpay.merchant_id', '');
        $this->secretKey = config('webxpay.secret_key', '');
        $this->publicKey = config('webxpay.public_key', '');
        $this->apiUsername = config('webxpay.api_username', '');
        $this->apiPassword = config('webxpay.api_password', '');
        $this->currency = config('webxpay.currency', 'LKR');
        $this->frontendUrl = rtrim(config('webxpay.frontend_url', 'https://ai.loopsintegrated.co/ThyagaMall'), '/');
        $this->returnUrl = config('webxpay.return_url') ?: ($this->frontendUrl.'/api/payment/webxpay/callback');
    }

    /**
     * Get the gateway endpoint URL for redirect form submission
     */
    public function getCheckoutUrl(): string
    {
        return $this->checkoutUrl;
    }

    /**
     * Prepare payment form fields for WebXpay redirect
     */
    public function preparePaymentPayload(Order $order): array
    {
        // Split customer name into first and last name
        $nameParts = preg_split('/\s+/', trim($order->customer_name));
        $firstName = mb_substr($nameParts[0] ?? 'Customer', 0, 30);
        $lastName = count($nameParts) > 1 ? mb_substr(implode(' ', array_slice($nameParts, 1)), 0, 30) : 'Customer';

        // Clean and validate contact number
        $cleanPhone = preg_replace('/[^\d+]/', '', $order->customer_phone);
        if (strlen($cleanPhone) < 9) {
            $cleanPhone = '0770000000';
        }

        // Format price to 2 decimal places (WebXpay Sandbox enforces a maximum test limit of LKR 100.00)
        $actualTotal = (float) $order->total;
        $price = number_format($actualTotal, 2, '.', '');
        if ($this->mode === 'sandbox' && $actualTotal > 100.00) {
            $price = '100.00';
            Log::info('WebXpay Sandbox: Total capped to LKR 100.00 for sandbox test gateway compatibility', [
                'order_number' => $order->order_number,
                'actual_total' => $actualTotal,
            ]);
        }

        // Custom fields pipe-separated (e.g. order_number|total|order_id)
        $customFieldsPlain = $order->order_number.'|'.$price.'|'.$order->id;
        $customFieldsEncoded = base64_encode($customFieldsPlain);

        // Core fields standard for WebXPay
        $fields = [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $order->customer_email,
            'contact_number' => $cleanPhone,
            'address_line_one' => mb_substr($order->shipping_address, 0, 100),
            'address_line_two' => '',
            'city' => mb_substr($order->shipping_city ?: 'Colombo', 0, 50),
            'state' => 'Western',
            'postal_code' => $order->shipping_postal_code ?: '00500',
            'country' => 'Sri Lanka',
            'process_payment' => '1',
            'price' => $price,
            'amount' => $price,
            'order_id' => $order->order_number,
            'order_reference_number' => $order->order_number,
            'currency' => $this->currency,
            'custom_fields' => $customFieldsEncoded,
            'return_url' => $this->returnUrl,
            'cancel_url' => $this->frontendUrl.'/checkout?payment_error=Payment%20was%20cancelled%20by%20user',
        ];

        if (! empty($this->merchantId)) {
            $fields['merchant_id'] = $this->merchantId;
            $fields['merchant_mid'] = $this->merchantId;
        }

        if (! empty($this->secretKey)) {
            $fields['secret_key'] = $this->secretKey;
        }

        if (! empty($this->apiUsername)) {
            $fields['api_username'] = $this->apiUsername;
        }

        // Encrypt payment payload using WebXPay RSA Public Key (Format: order_id|total_amount)
        $paymentPlaintext = "{$order->order_number}|{$price}";

        if (! empty($this->publicKey)) {
            $formattedKey = $this->formatPublicKey($this->publicKey);
            $publicKeyResource = @openssl_pkey_get_public($formattedKey);
            $encryptedData = '';

            if ($publicKeyResource && @openssl_public_encrypt($paymentPlaintext, $encryptedData, $publicKeyResource, OPENSSL_PKCS1_OAEP_PADDING)) {
                $fields['payment'] = base64_encode($encryptedData);
            } else {
                Log::error('WebXpay RSA encryption failed: '.openssl_error_string());
                $fields['payment'] = base64_encode($paymentPlaintext);
            }
        } else {
            $fields['payment'] = base64_encode($paymentPlaintext);
        }

        return [
            'gateway_url' => $this->checkoutUrl,
            'method' => 'POST',
            'params' => $fields,
            'order_number' => $order->order_number,
            'total' => $order->total,
        ];
    }

    /**
     * Verify and parse incoming WebXpay callback response.
     *
     * A payment is only reported as successful when the `payment` payload carries a
     * valid RSA signature from WebXpay. Anything else (unsigned fields, a bad or
     * missing signature, no public key configured) is treated as failed — the
     * callback URL is public, so unsigned data can be forged by anyone.
     */
    public function verifyCallback(Request $request): array
    {
        Log::info('WebXpay Callback received', [
            'method' => $request->method(),
            'keys' => array_keys($request->all()),
            'ip' => $request->ip(),
        ]);

        $orderNumber = null;
        $status = 'failed';
        $transactionId = null;
        $message = 'Payment could not be verified';

        $paymentEncoded = (string) $request->input('payment', '');
        $signatureEncoded = (string) $request->input('signature', '');

        if ($paymentEncoded !== '') {
            $paymentData = (string) base64_decode($paymentEncoded, true);
            $signature = $signatureEncoded !== '' ? base64_decode($signatureEncoded, true) : false;
            $signatureValid = $signature !== false && $paymentData !== '' && $this->isValidSignature($paymentData, $signature);

            $parsed = $this->parsePaymentData($paymentData);
            $orderNumber = $parsed['order_number'] ?? null;
            $transactionId = $parsed['transaction_id'] ?? null;

            if (! $signatureValid) {
                Log::warning('WebXpay callback rejected: invalid or missing signature', ['order_number' => $orderNumber]);
            } elseif ($parsed['status'] === 'success' || in_array((string) $parsed['status_code'], ['0', '00'], true)) {
                $status = 'success';
                $message = $parsed['message'] ?: 'Payment approved';
            } else {
                $message = $parsed['message'] ?: 'Payment rejected';
            }

            if (! $orderNumber && ($customFieldsEncoded = $request->input('custom_fields'))) {
                $customParts = explode('|', (string) base64_decode($customFieldsEncoded));
                $orderNumber = $customParts[0] ?? null;
            }
        }

        // Unsigned fields are only used to find the order for the "payment failed" redirect.
        if (! $orderNumber) {
            $orderNumber = $request->input('order_id')
                ?: $request->input('order_reference_number')
                ?: $request->input('merchant_ref');
            $message = $request->input('message') ? (string) $request->input('message') : 'Payment unsuccessful or cancelled';
        }

        return [
            'is_valid' => ($status === 'success'),
            'status' => $status,
            'order_number' => $orderNumber ? (string) $orderNumber : null,
            'transaction_id' => $transactionId,
            'message' => mb_substr($message, 0, 200),
        ];
    }

    /**
     * Check WebXpay's RSA signature over the decoded payment string.
     */
    protected function isValidSignature(string $paymentData, string $signature): bool
    {
        if (empty($this->publicKey)) {
            Log::error('WebXpay callback cannot be verified: WEBXPAY_PUBLIC_KEY is not configured.');

            return false;
        }

        $key = @openssl_pkey_get_public($this->formatPublicKey($this->publicKey));
        if (! $key) {
            Log::error('WebXpay public key is invalid: '.openssl_error_string());

            return false;
        }

        // WebXpay signs by encrypting the payment string with its private key.
        $decrypted = '';
        if (@openssl_public_decrypt($signature, $decrypted, $key) && hash_equals($paymentData, $decrypted)) {
            return true;
        }

        return @openssl_verify($paymentData, $signature, $key, OPENSSL_ALGO_SHA256) === 1;
    }

    /**
     * Helper to format RSA Public Key if stored without headers
     */
    protected function formatPublicKey(string $key): string
    {
        $key = trim($key);
        if (str_contains($key, '-----BEGIN PUBLIC KEY-----')) {
            return $key;
        }

        return "-----BEGIN PUBLIC KEY-----\n".wordwrap($key, 64, "\n", true)."\n-----END PUBLIC KEY-----";
    }

    /**
     * Parse payment response data (JSON or pipe-separated)
     */
    protected function parsePaymentData(string $data): array
    {
        // Try JSON decode first
        $json = json_decode($data, true);
        if (is_array($json)) {
            return [
                'order_number' => $json['order_id'] ?? $json['order_reference_number'] ?? $json['merchant_ref'] ?? null,
                'status' => strtolower($json['status'] ?? ''),
                'status_code' => $json['status_code'] ?? null,
                'transaction_id' => $json['transaction_id'] ?? $json['ref_id'] ?? null,
                'message' => $json['message'] ?? null,
            ];
        }

        // Fallback: pipe-delimited format (order_id|status_code|ref_id|...)
        $parts = explode('|', $data);

        return [
            'order_number' => $parts[0] ?? null,
            'status_code' => $parts[1] ?? null,
            'status' => (isset($parts[1]) && in_array($parts[1], ['0', '00', 'success', 'approved'])) ? 'success' : 'failed',
            'transaction_id' => $parts[2] ?? null,
            'message' => $parts[3] ?? null,
        ];
    }

    /**
     * Get frontend URL to redirect user after payment
     */
    public function getFrontendRedirectUrl(string $orderNumber, bool $isSuccess, ?string $errorMessage = null): string
    {
        $base = rtrim($this->frontendUrl, '/');
        if ($isSuccess) {
            return "{$base}/order-success/?order={$orderNumber}&payment=paid";
        }

        $errorMsg = urlencode($errorMessage ?: 'Payment could not be completed. Please try again.');

        return "{$base}/checkout/?payment_error={$errorMsg}&order={$orderNumber}";
    }
}
