<?php

return [
    // Only the storefront origins may call the API from a browser.
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', env(
        'CORS_ALLOWED_ORIGINS',
        'https://uat.loopsintegrated.co,https://ai.loopsintegrated.co,http://localhost:3000,http://127.0.0.1:3000'
    ))))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
