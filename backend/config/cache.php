<?php

return [
    'default' => env('CACHE_DRIVER', 'redis'),

    'stores' => [
        'redis' => [
            'driver'     => 'redis',
            'connection' => 'cache',
        ],
        'file' => [
            'driver' => 'file',
            'path'   => storage_path('framework/cache'),
        ],
    ],

    'prefix' => 'numeros_rojos_cache',
];
