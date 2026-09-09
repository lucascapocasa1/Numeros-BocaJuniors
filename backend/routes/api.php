<?php

/** @var \Laravel\Lumen\Routing\Router $router */

// Sitemap (público, sin versión)
$router->get('api/sitemap.xml', ['uses' => 'Api\V1\SitemapController@index']);

$router->group(['prefix' => 'api/v1', 'namespace' => 'Api\V1'], function () use ($router) {

    // Auth
    $router->post('auth/login', 'AuthController@login');

    // Public endpoints
    $router->get('economy', 'EconomyRecordController@index');
    $router->get('economy/monthly-summary', 'EconomyRecordController@monthlySummary');
    $router->get('economy/overdue-evolution', 'EconomyRecordController@overdueEvolution');
    $router->get('economy/{id}', 'EconomyRecordController@show');
    $router->get('contracts', 'ContractController@index');
    $router->get('contracts/stats', 'ContractController@stats');
    $router->get('contracts/recent-moves', 'ContractController@recentMoves');
    $router->get('contracts/{id}', 'ContractController@show');
    $router->get('rights', 'RightController@index');
    $router->get('rights/{id}', 'RightController@show');
    $router->get('rumors', 'RumorController@index');
    $router->get('rumors/{id}', 'RumorController@show');
    $router->get('markets', 'MarketController@index');
    $router->get('elections', 'ElectionController@index');
    $router->get('elections/token/{token}', 'ElectionController@showByToken');
    $router->get('elections/slug/{slug}', 'ElectionController@showBySlug');
    $router->get('elections/lists/{id}/logo', 'ElectionController@logo');
    $router->get('elections/candidates/{id}/photo', 'ElectionController@candidatePhoto');
    $router->get('elections/candidates/{id}/cv', 'ElectionController@candidateCv');

    // Balances (public)
    $router->get('balances', 'BalanceController@index');
    $router->get('balances/evolution', 'BalanceController@evolution');
    $router->get('balances/{id}', 'BalanceController@show');
    $router->get('balances/{id}/download', 'BalanceController@download');

    // Section visibility (public)
    $router->get('settings/sections', 'SettingsController@sections');

    // Stadium (public)
    $router->get('stadium', 'StadiumController@index');

    // Contact
    $router->post('contact', 'ContactController@send');

    // Refresh no necesita jwt.auth: acepta tokens expirados por diseño
    $router->post('admin/auth/refresh', ['uses' => 'Api\V1\AuthController@refresh']);

    // Admin (protected)
    $router->group(['middleware' => 'jwt.auth', 'prefix' => 'admin'], function () use ($router) {
        // Auth
        $router->get('me', 'AuthController@me');
        $router->post('auth/logout', 'AuthController@logout');
        $router->post('auth/change-password', 'AuthController@changePassword');

        // Settings
        $router->get('settings', 'SettingsController@index');
        $router->put('settings', 'SettingsController@update');

        // Economy CRUD
        $router->post('economy', 'EconomyRecordController@store');
        $router->put('economy/{id}', 'EconomyRecordController@update');
        $router->delete('economy/{id}', 'EconomyRecordController@destroy');

        // Contracts CRUD
        $router->post('contracts', 'ContractController@store');
        $router->put('contracts/{id}', 'ContractController@update');
        $router->delete('contracts/{id}', 'ContractController@destroy');
        $router->post('contracts/{id}/save-as-change', 'ContractController@saveAsChange');

        // Rights CRUD
        $router->post('rights', 'RightController@store');
        $router->put('rights/{id}', 'RightController@update');
        $router->delete('rights/{id}', 'RightController@destroy');

        // Rumors CRUD
        $router->post('rumors', 'RumorController@store');
        $router->put('rumors/{id}', 'RumorController@update');
        $router->delete('rumors/{id}', 'RumorController@destroy');

        // Markets CRUD
        $router->post('markets', 'MarketController@store');
        $router->put('markets/{id}', 'MarketController@update');
        $router->delete('markets/{id}', 'MarketController@destroy');
        $router->post('markets/{id}/activate', 'MarketController@activate');
        $router->post('markets/deactivate', 'MarketController@deactivate');

        // Balances CRUD
        $router->post('balances', 'BalanceController@store');
        $router->put('balances/{id}', 'BalanceController@update');
        // POST route for file uploads (multipart/form-data support)
        $router->post('balances/{id}/update', 'BalanceController@update');
        $router->delete('balances/{id}', 'BalanceController@destroy');
        $router->post('balances/{id}/analyze', 'BalanceController@analyze');
        $router->post('balances/{id}/apply-analysis', 'BalanceController@applyAnalysis');

        // Balance items (for admin configuration)
        $router->get('balances/items', 'BalanceController@allBalanceItems');

        // Balance lines CRUD (manual editing)
        $router->post('balances/{balanceId}/lines', 'BalanceController@storeLine');
        $router->post('balances/{balanceId}/lines/reorder', 'BalanceController@reorderLines');
        $router->put('balances/{balanceId}/lines/{lineId}', 'BalanceController@updateLine');
        $router->delete('balances/{balanceId}/lines/{lineId}', 'BalanceController@destroyLine');

        // Stadium CRUD
        $router->post('stadium/config', 'StadiumController@storeConfig');
        $router->post('stadium/sectors', 'StadiumController@storeSector');
        $router->put('stadium/sectors/{id}', 'StadiumController@updateSector');
        $router->delete('stadium/sectors/{id}', 'StadiumController@destroySector');

        // Elections CRUD
        $router->get('elections', 'ElectionController@adminIndex');
        $router->post('elections/lists', 'ElectionController@storeList');
        $router->post('elections/lists/{id}/update', 'ElectionController@updateList');
        $router->delete('elections/lists/{id}', 'ElectionController@destroyList');
        $router->post('elections/lists/{listId}/candidates', 'ElectionController@storeCandidate');
        $router->post('elections/candidates/{id}/update', 'ElectionController@updateCandidate');
        $router->delete('elections/candidates/{id}', 'ElectionController@destroyCandidate');
        $router->post('elections/lists/{listId}/proposals', 'ElectionController@storeProposal');
        $router->put('elections/proposals/{id}', 'ElectionController@updateProposal');
        $router->delete('elections/proposals/{id}', 'ElectionController@destroyProposal');
        $router->post('elections/proposals/{proposalId}/commitments', 'ElectionController@storeCommitment');
        $router->put('elections/commitments/{id}', 'ElectionController@updateCommitment');
        $router->delete('elections/commitments/{id}', 'ElectionController@destroyCommitment');

        // Twitter accounts CRUD
        $router->get('twitter/accounts', 'TwitterController@index');
        $router->post('twitter/accounts', 'TwitterController@store');
        $router->put('twitter/accounts/{id}', 'TwitterController@update');
        $router->delete('twitter/accounts/{id}', 'TwitterController@destroy');
    });
});
