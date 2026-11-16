<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Prompt Xpress Courier
    |--------------------------------------------------------------------------
    | Consignment tracking (https://api.promptxpress.net). Status lookups are
    | public; the credentials are optional and only used if the API requires them.
    */
    'promptxpress' => [
        'base_url' => env('PROMPTXPRESS_BASE_URL', 'https://api.promptxpress.net'),
        'user_id' => env('PROMPTXPRESS_USER_ID'),
        'password' => env('PROMPTXPRESS_PASSWORD'),
        'timeout' => (int) env('PROMPTXPRESS_TIMEOUT', 10),
        'cache_seconds' => (int) env('PROMPTXPRESS_CACHE_SECONDS', 60),
    ],

];
