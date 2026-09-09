<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    private const SECTION_KEYS = [
        'section_economia_enabled',
        'section_contratos_enabled',
        'section_derechos_enabled',
        'section_balances_enabled',
        'section_estadio_enabled',
        'section_rumores_enabled',
        'section_elecciones_enabled',
    ];

    // Sections that default to disabled when no setting exists in DB
    private const SECTION_KEYS_DEFAULT_OFF = [
        'section_rumores_enabled',
        'section_elecciones_enabled',
    ];

    private const CHART_SCALE_KEYS = [
        'chart_scale_usd',
        'chart_scale_eur',
        'chart_scale_ars',
    ];

    public function index(): JsonResponse
    {
        $settings = Setting::all()->pluck('value', 'key');
        return response()->json(['data' => $settings]);
    }

    public function sections(): JsonResponse
    {
        $allKeys = array_merge(self::SECTION_KEYS, self::CHART_SCALE_KEYS);
        $settings = Setting::whereIn('key', $allKeys)->pluck('value', 'key');

        $result = [];
        foreach (self::SECTION_KEYS as $key) {
            $default = in_array($key, self::SECTION_KEYS_DEFAULT_OFF) ? '0' : '1';
            $result[$key] = ($settings->get($key, $default) === '1');
        }
        foreach (self::CHART_SCALE_KEYS as $key) {
            $raw = $settings->get($key);
            $result[$key] = ($raw !== null && $raw !== '') ? (float) $raw : null;
        }

        return response()->json(['data' => $result]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->validate($request, [
            'data_service'               => 'sometimes|in:disabled,besoccer',
            'besoccer_api_key'           => 'sometimes|nullable|string',
            'besoccer_team_id'           => 'sometimes|nullable|string|max:50',
            'openai_api_key'             => 'sometimes|nullable|string',
            'openai_model'               => 'sometimes|nullable|string|max:100',
            'twitter_api_key'            => 'sometimes|nullable|string',
            'section_economia_enabled'   => 'sometimes|boolean',
            'section_contratos_enabled'  => 'sometimes|boolean',
            'section_derechos_enabled'   => 'sometimes|boolean',
            'section_balances_enabled'   => 'sometimes|boolean',
            'section_estadio_enabled'    => 'sometimes|boolean',
            'section_rumores_enabled'    => 'sometimes|boolean',
            'section_elecciones_enabled' => 'sometimes|boolean',
            'balance_chart_default_items'   => 'sometimes|nullable|string',
            'balance_chart_filter_items'    => 'sometimes|nullable|string',
            'balance_chart_label_overrides' => 'sometimes|nullable|string',
            'chart_scale_usd'              => 'sometimes|nullable|numeric|min:0.0001',
            'chart_scale_eur'              => 'sometimes|nullable|numeric|min:0.0001',
            'chart_scale_ars'              => 'sometimes|nullable|numeric|min:0.0001',
        ]);

        $allowed = [
            'data_service', 'besoccer_api_key', 'besoccer_team_id', 'openai_api_key', 'openai_model',
            'twitter_api_key',
            'section_economia_enabled', 'section_contratos_enabled', 'section_derechos_enabled',
            'section_balances_enabled', 'section_estadio_enabled', 'section_rumores_enabled',
            'section_elecciones_enabled',
            'balance_chart_default_items', 'balance_chart_filter_items', 'balance_chart_label_overrides',
            'chart_scale_usd', 'chart_scale_eur', 'chart_scale_ars',
        ];

        foreach ($request->only($allowed) as $key => $value) {
            // Normalize booleans to '1'/'0' strings for storage
            if (in_array($key, self::SECTION_KEYS)) {
                $value = $value ? '1' : '0';
            }
            Setting::set($key, $value);
        }

        $settings = Setting::all()->pluck('value', 'key');
        return response()->json(['data' => $settings]);
    }
}
