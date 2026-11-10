<?php

return [
    /*
    |--------------------------------------------------------------------------
    | WebXpay Environment Mode
    |--------------------------------------------------------------------------
    | Set to 'sandbox' for test transactions or 'live' for production.
    */
    'mode' => env('WEBXPAY_MODE', 'sandbox'),

    /*
    |--------------------------------------------------------------------------
    | Gateway Endpoints
    |--------------------------------------------------------------------------
    */
    'endpoints' => [
        'sandbox' => env('WEBXPAY_SANDBOX_URL', 'https://stagingxpay.info/index.php?route=checkout/billing'),
        'live' => env('WEBXPAY_LIVE_URL', 'https://webxpay.com/index.php?route=checkout/billing'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Merchant Credentials
    |--------------------------------------------------------------------------
    | Retrieve these from your WebXpay Merchant Portal:
    | Portal: https://merchant.webxpay.com/ -> Settings -> Website Integration
    */
    'merchant_id' => env('WEBXPAY_MERCHANT_ID', ''),
    'secret_key' => env('WEBXPAY_SECRET_KEY', ''),
    'public_key' => env('WEBXPAY_PUBLIC_KEY', ''),
    'api_username' => env('WEBXPAY_API_USERNAME', ''),
    'api_password' => env('WEBXPAY_API_PASSWORD', ''),

    /*
    |--------------------------------------------------------------------------
    | Currency & Locale
    |--------------------------------------------------------------------------
    */
    'currency' => env('WEBXPAY_CURRENCY', 'LKR'),

    /*
    |--------------------------------------------------------------------------
    | Return & Redirect URLs
    |--------------------------------------------------------------------------
    */
    'return_url' => env('WEBXPAY_RETURN_URL', null),
    'frontend_url' => env('WEBXPAY_FRONTEND_URL', 'https://uat.loopsintegrated.co/thyaga'),
];
