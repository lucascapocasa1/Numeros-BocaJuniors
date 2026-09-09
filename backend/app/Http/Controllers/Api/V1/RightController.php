<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Right;
use App\Services\BeSoccerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RightController extends Controller
{
    private BeSoccerService $besoccerService;

    public function __construct(BeSoccerService $besoccerService)
    {
        $this->besoccerService = $besoccerService;
    }

    private function enrichWithPlayerAvatar(array $right): array
    {
        if (!empty($right['external_id'])) {
            $playerFull = $this->besoccerService->getPlayerData($right['external_id']);
            if ($playerFull['success'] ?? false) {
                $defaultAvatar = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/default-avatar.svg';
                $data = $playerFull['data'];
                $right['player_avatar'] = $data['player_avatar'] ?? $defaultAvatar;
                $right['country_flag']  = $data['country_flag'] ?? null;
                $right['country']       = $data['country'] ?? null;
                $team = $data['current_team'] ?? null;
                $right['current_team_name'] = $team
                    ? ($team['nameShow'] ?? $team['fullName'] ?? $team['name'] ?? null)
                    : null;
                $pos1 = $data['pos1'] ?? null;
                $right['positions'] = !empty($pos1) ? [['pos' => $pos1]] : [];
            }
        }
        return $right;
    }

    public function index(Request $request): JsonResponse
    {
        $query = Right::query()->search($request->input('search'));

        $perPage = min((int) $request->input('per_page', 100), 100);
        $rights = $query->orderBy('full_name', 'asc')->paginate($perPage);

        $rightsData = array_map(function ($right) {
            return $this->enrichWithPlayerAvatar($right->toArray());
        }, $rights->items());

        return response()->json([
            'data' => $rightsData,
            'meta' => [
                'current_page' => $rights->currentPage(),
                'last_page'    => $rights->lastPage(),
                'per_page'     => $rights->perPage(),
                'total'        => $rights->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $right = Right::findOrFail($id);
        $rightData = $this->enrichWithPlayerAvatar($right->toArray());

        return response()->json(['data' => $rightData]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->validate($request, [
            'external_id'    => 'nullable|string|max:255',
            'full_name'      => 'required|string|max:255',
            'clauses'        => 'nullable|array',
            'links'          => 'nullable|array',
            'links.*.url'    => 'required|url',
            'links.*.official' => 'required|boolean',
        ]);

        $right = Right::create($request->only(['external_id', 'full_name', 'clauses', 'links']));

        return response()->json(['data' => $right], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $right = Right::findOrFail($id);

        $this->validate($request, [
            'external_id'    => 'nullable|string|max:255',
            'full_name'      => 'sometimes|string|max:255',
            'clauses'        => 'nullable|array',
            'links'          => 'nullable|array',
            'links.*.url'    => 'required|url',
            'links.*.official' => 'required|boolean',
        ]);

        $right->update($request->only(['external_id', 'full_name', 'clauses', 'links']));

        return response()->json(['data' => $right]);
    }

    public function destroy(int $id): JsonResponse
    {
        $right = Right::findOrFail($id);
        $right->delete();

        return response()->json(['message' => 'Derecho eliminado'], 200);
    }
}
