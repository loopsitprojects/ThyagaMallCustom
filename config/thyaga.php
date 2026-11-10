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

    /*
    |--------------------------------------------------------------------------
    | Merchant Waybill / Dispatch Settings
    |--------------------------------------------------------------------------
    | Default values for merchant collection orders & waybills.
    */
    'waybill' => [
        'store_address' => env('WAYBILL_STORE_ADDRESS', 'No.2 Sulaiman Terrace, Colombo 5'),
        'dispatch_contact' => env('WAYBILL_DISPATCH_CONTACT', 'JOY- 0710982629'),
        'default_delivery_date' => env('WAYBILL_DELIVERY_DATE', 'Within 24 hours'),
        'default_delivery_address' => env('WAYBILL_DELIVERY_ADDRESS', 'THYAGA OFFICE'),
    ],
];
