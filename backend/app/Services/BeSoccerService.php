<?php

namespace App\Services;

use App\Models\Setting;
use Carbon\Carbon;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class BeSoccerService
{
    private Client $client;
    private ?string $apiKey;
    private string $baseUrl;
    private int $cacheTtlMin;
    private int $cacheTtlMax;

    public function __construct()
    {
        $this->baseUrl = config('besoccer.base_url');
        $this->client = new Client([
            'timeout' => 15,
        ]);
        $settingKey = Setting::get('besoccer_api_key');
        $this->apiKey = $settingKey ?: config('besoccer.api_key') ?: null;
        $this->cacheTtlMin = config('besoccer.cache_ttl.min');
        $this->cacheTtlMax = config('besoccer.cache_ttl.max');
    }

    private function randomTtl(): int
    {
        return rand($this->cacheTtlMin, $this->cacheTtlMax);
    }

    public function isEnabled(): bool
    {
        return Setting::get('data_service', 'disabled') === 'besoccer' && !empty($this->apiKey);
    }

    public function getPlayerStats(string $playerId): array
    {
        if (!$this->isEnabled()) {
            return ['success' => false, 'error' => 'Servicio de datos desactivado'];
        }

        $cacheKey = "besoccer:player:{$playerId}:stats";

        return $this->rememberOnSuccess($cacheKey, $this->randomTtl(), function () use ($playerId) {
            return $this->request("/player/{$playerId}/stats");
        });
    }

    public function getLeagueStats(array $params = []): array
    {
        if (!$this->isEnabled()) {
            return ['success' => false, 'error' => 'Servicio de datos desactivado'];
        }

        $cacheKey = 'besoccer:league:stats:' . md5(json_encode($params));

        return $this->rememberOnSuccess($cacheKey, $this->randomTtl(), function () use ($params) {
            return $this->request('/league/stats', $params);
        });
    }

    public function getTeam(string $teamId): array
    {
        if (!$this->isEnabled()) {
            return ['success' => false, 'error' => 'Servicio de datos desactivado'];
        }

        $cacheKey = "besoccer:team:{$teamId}";

        return $this->rememberOnSuccess($cacheKey, $this->randomTtl(), function () use ($teamId) {
            return $this->request('/api.php', [
                'format' => 'json',
                'req'    => 'team',
                'id'     => $teamId,
            ]);
        });
    }

    public function getPlayerMatches(string $playerId, ?int $year = null): array
    {
        if (!$this->isEnabled()) {
            return ['success' => false, 'error' => 'Servicio de datos desactivado'];
        }

        $cacheKey = $year
            ? "besoccer:player:{$playerId}:matches:{$year}"
            : "besoccer:player:{$playerId}:matches";

        return $this->rememberOnSuccess($cacheKey, $this->randomTtl(), function () use ($playerId, $year) {
            $params = [
                'format' => 'json',
                'req'    => 'player_matches',
                'id'     => $playerId,
            ];
            if ($year !== null) {
                $params['year'] = $year;
            }
            return $this->request('/api.php', $params);
        });
    }

    public function getPlayerData(string $playerId): array
    {
        if (!$this->isEnabled()) {
            return ['success' => false, 'error' => 'Servicio de datos desactivado'];
        }

        $cacheKey = "besoccer:player:{$playerId}:full_data";

        return $this->rememberOnSuccess($cacheKey, $this->randomTtl(), function () use ($playerId) {
            $playerData = $this->getPlayerByExternalId($playerId);
            if (!($playerData['success'] ?? false)) {
                return $playerData;
            }

            $result = $playerData['data'];
            $teamId = isset($result['team_id']) ? (string) $result['team_id'] : null;
            $ownTeamId = Setting::get('besoccer_team_id');

            $result['current_team'] = null;

            if ($teamId && $teamId !== $ownTeamId) {
                $teamData = $this->getTeam($teamId);
                if ($teamData['success'] ?? false) {
                    $team = $teamData['data']['team'] ?? null;
                    if ($team) {
                        $result['current_team'] = $team;
                    }
                }
            }

            return [
                'success'    => true,
                'data'       => $result,
                'source'     => 'besoccer',
                'cached'     => false,
                'fetched_at' => Carbon::now()->toIso8601String(),
            ];
        });
    }

    public function getPlayerByExternalId(string $externalId): array
    {
        if (!$this->isEnabled()) {
            return ['success' => false, 'error' => 'Servicio de datos desactivado'];
        }

        return $this->request('/api.php', [
            'format' => 'json',
            'req'    => 'player',
            'id'     => $externalId,
        ]);
    }

    private function rememberOnSuccess(string $cacheKey, int $ttl, callable $callback): array
    {
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $result = $callback();

        if ($result['success'] ?? false) {
            Cache::put($cacheKey, $result, $ttl);
        }

        return $result;
    }

    private function request(string $endpoint, array $params = []): array
    {
        try {
            $params['key'] = $this->apiKey;

            $url = rtrim($this->baseUrl, '/') . $endpoint;

            $response = $this->client->get($url, [
                'query' => $params,
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            return $this->transformResponse($data);
        } catch (GuzzleException $e) {
            Log::error("BeSoccer API error: {$e->getMessage()}", [
                'endpoint' => $endpoint,
                'params'   => $params,
            ]);

            return [
                'success' => false,
                'error'   => 'No se pudo obtener datos de BeSoccer',
                'detail'  => app()->environment('local') ? $e->getMessage() : null,
            ];
        }
    }

    private function transformResponse(?array $data): array
    {
        if ($data === null) {
            return [
                'success' => false,
                'error'   => 'Respuesta vacía de BeSoccer',
            ];
        }

        return [
            'success'    => true,
            'data'       => $data['result'] ?? $data['data'] ?? $data,
            'source'     => 'besoccer',
            'cached'     => false,
            'fetched_at' => Carbon::now()->toIso8601String(),
        ];
    }
}
