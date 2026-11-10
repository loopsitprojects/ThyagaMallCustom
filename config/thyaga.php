<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Thyāga Gift Voucher Integration Mode
    |--------------------------------------------------------------------------
    | Supported: "sandbox", "live"
    */
    'mode' => env('THYAGA_VOUCHER_MODE', 'live'),

    /*
    |--------------------------------------------------------------------------
    | Thyāga Partner API Key
    |--------------------------------------------------------------------------
    | Generated from the Thyāga Partner Portal.
    */
    'api_key' => env('THYAGA_VOUCHER_API_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | API Base URLs
    |--------------------------------------------------------------------------
    */
    'endpoints' => [
        'sandbox' => env('THYAGA_VOUCHER_SANDBOX_URL', ''),
        'live' => env('THYAGA_VOUCHER_LIVE_URL', ''),
    ],

    /*
    |--------------------------------------------------------------------------
    | Timeout in seconds for HTTP requests
    |--------------------------------------------------------------------------
    */
    'timeout' => (int) env('THYAGA_VOUCHER_TIMEOUT', 15),
];
