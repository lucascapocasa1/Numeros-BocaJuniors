<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\BeSoccerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    private BeSoccerService $besoccer;

    public function __construct(BeSoccerService $besoccer)
    {
        $this->besoccer = $besoccer;
    }

    public function playerStats(string $id): JsonResponse
    {
        $data = $this->besoccer->getPlayerStats($id);

        if (!($data['success'] ?? false)) {
            return response()->json($data, 502);
        }

        return response()->json($data);
    }

    public function leagueStats(Request $request): JsonResponse
    {
        $params = $request->only(['league', 'season']);
        $data = $this->besoccer->getLeagueStats($params);

        if (!($data['success'] ?? false)) {
            return response()->json($data, 502);
        }

        return response()->json($data);
    }

    public function team(Request $request): JsonResponse
    {
        $teamId = $request->query('team') ?: Setting::get('besoccer_team_id');

        if (!$teamId) {
            return response()->json(['success' => false, 'error' => 'ID de equipo no configurado'], 422);
        }

        $data = $this->besoccer->getTeam($teamId);

        if (!($data['success'] ?? false)) {
            return response()->json($data, 502);
        }

        if (isset($data['data']['team']['squad'])) {
            $defaultAvatar = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/default-avatar.svg';
            $data['data']['team']['squad'] = array_map(function ($player) use ($defaultAvatar) {
                $player['image'] = $player['image'] ?? $defaultAvatar;
                if (!empty($player['id'])) {
                    $playerFull = $this->besoccer->getPlayerData((string) $player['id']);
                    if ($playerFull['success'] ?? false) {
                        $pos1 = $playerFull['data']['pos1'] ?? null;
                        $player['pos1'] = !empty($pos1) ? $pos1 : null;
                    }
                }
                return $player;
            }, $data['data']['team']['squad']);
        }

        return response()->json($data);
    }

    public function playerMatches(Request $request, string $id): JsonResponse
    {
        $year = $request->query('year') ? (int) $request->query('year') : null;
        $data = $this->besoccer->getPlayerMatches($id, $year);

        if (!($data['success'] ?? false)) {
            return response()->json($data, 502);
        }

        return response()->json($data);
    }

    public function playerData(string $id): JsonResponse
    {
        $data = $this->besoccer->getPlayerData($id);

        if (!($data['success'] ?? false)) {
            return response()->json($data, 502);
        }

        return response()->json($data);
    }
}
