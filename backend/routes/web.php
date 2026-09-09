<?php

/** @var \Laravel\Lumen\Routing\Router $router */

$router->get('/', function () {
    return response()->json([
        'name'    => 'Números Boca Juniors API',
        'version' => '1.0.0',
        'status'  => 'running',
    ]);
});
