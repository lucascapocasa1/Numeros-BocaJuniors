<?php

return [
    'base_url' => env('BESOCCER_BASE_URL', 'https://apiclient.besoccerapps.com/scripts/api'),
    'api_key'  => env('BESOCCER_API_KEY'),

    'cache_ttl' => [
        'min' => (int) env('CACHE_TTL_MIN', 43200),
        'max' => (int) env('CACHE_TTL_MAX', 129600),
    ],
];
