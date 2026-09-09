<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Market;
use App\Models\Rumor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RumorController extends Controller
{
    private function enrichWithPlayerAvatar(array $rumor): array
    {
        return $rumor;
    }

    private function getPreviousMarkets(array $rumor, ?int $activeMarketId): array
    {
        if ($activeMarketId === null) {
            return [];
        }

        $query = Rumor::query()
            ->whereNotNull('market_id')
            ->where('market_id', '!=', $activeMarketId)
            ->with('market');

        if (!empty($rumor['external_id'])) {
            $query->where('external_id', $rumor['external_id']);
        } else {
            $query->where('full_name', $rumor['full_name']);
        }

        return $query->get()
            ->filter(fn($r) => $r->market !== null)
            ->pluck('market.name')
            ->unique()
            ->values()
            ->toArray();
    }

    public function index(Request $request): JsonResponse
    {
        $activeMarket = Market::where('is_active', true)->first();

        $query = Rumor::query()->search($request->input('search'));

        $isAdminAll = filter_var($request->input('all'), FILTER_VALIDATE_BOOLEAN);

        if ($isAdminAll) {
            // Admin view: optionally filter by a specific market
            if ($request->has('market_id') && $request->input('market_id') !== '') {
                $query->where('market_id', (int) $request->input('market_id'));
            }
        } else {
            // Public view: filter by active market if one is set
            if ($activeMarket) {
                $query->where('market_id', $activeMarket->id);
            }
        }

        $perPage = min((int) $request->input('per_page', 100), 100);
        $rumors = $query->orderBy('full_name', 'asc')->paginate($perPage);

        $activeMarketId = $isAdminAll ? null : $activeMarket?->id;

        $rumorsData = array_map(function ($rumor) use ($activeMarketId) {
            $data = $this->enrichWithPlayerAvatar($rumor->toArray());
            $data['previous_markets'] = $this->getPreviousMarkets($data, $activeMarketId);
            return $data;
        }, $rumors->items());

        return response()->json([
            'data'          => $rumorsData,
            'active_market' => $activeMarket ? ['id' => $activeMarket->id, 'name' => $activeMarket->name] : null,
            'meta'          => [
                'current_page' => $rumors->currentPage(),
                'last_page'    => $rumors->lastPage(),
                'per_page'     => $rumors->perPage(),
                'total'        => $rumors->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $rumor = Rumor::findOrFail($id);
        $rumorData = $this->enrichWithPlayerAvatar($rumor->toArray());

        return response()->json(['data' => $rumorData]);
    }

    public function store(Request $request): JsonResponse
    {
        $marketId = $request->input('market_id');

        $this->validate($request, [
            'market_id'        => 'required|exists:markets,id',
            'external_id'      => [
                'nullable', 'string', 'max:255',
                Rule::unique('rumors')->where(fn($q) => $q->where('market_id', $marketId)),
            ],
            'full_name'        => 'required|string|max:255',
            'status'           => 'nullable|in:rumor,contratado',
            'links'            => 'nullable|array',
            'links.*.url'      => 'required|url',
            'links.*.official' => 'required|boolean',
        ]);

        $rumor = Rumor::create($request->only(['market_id', 'external_id', 'full_name', 'status', 'links']));

        return response()->json(['data' => $rumor], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $rumor = Rumor::findOrFail($id);

        $marketId = $request->input('market_id');

        $this->validate($request, [
            'market_id'        => 'required|exists:markets,id',
            'external_id'      => [
                'nullable', 'string', 'max:255',
                Rule::unique('rumors')->where(fn($q) => $q->where('market_id', $marketId))->ignore($id),
            ],
            'full_name'        => 'sometimes|string|max:255',
            'status'           => 'nullable|in:rumor,contratado',
            'links'            => 'nullable|array',
            'links.*.url'      => 'required|url',
            'links.*.official' => 'required|boolean',
        ]);

        $rumor->update($request->only(['market_id', 'external_id', 'full_name', 'status', 'links']));

        return response()->json(['data' => $rumor]);
    }

    public function destroy(int $id): JsonResponse
    {
        $rumor = Rumor::findOrFail($id);
        $rumor->delete();

        return response()->json(['message' => 'Rumor eliminado'], 200);
    }
}
