<?php

return [
    'name' => env('APP_NAME', 'Numeros Boca Juniors API'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'timezone' => env('APP_TIMEZONE', 'America/Argentina/Buenos_Aires'),
    'key' => env('APP_KEY'),
    'cipher' => 'AES-256-CBC',
];
