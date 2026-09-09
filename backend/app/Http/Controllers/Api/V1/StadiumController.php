<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StadiumConfig;
use App\Models\StadiumSector;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StadiumController extends Controller
{
    // ─── Public ──────────────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        $stadium = StadiumConfig::with(['sectors'])->first();

        return response()->json([
            'data' => [
                'stadium' => $stadium,
            ],
        ]);
    }

    // ─── Admin: Stadium config ────────────────────────────────────────────────

    public function storeConfig(Request $request): JsonResponse
    {
        $this->validate($request, [
            'name'          => 'required|string|max:255',
            'link'          => 'nullable|url|max:500',
            'link_official' => 'sometimes|boolean',
        ]);

        $stadium = StadiumConfig::first();

        if ($stadium) {
            $stadium->update($request->only(['name', 'link', 'link_official']));
        } else {
            $stadium = StadiumConfig::create($request->only(['name', 'link', 'link_official']));
        }

        return response()->json(['data' => $stadium->load('sectors')]);
    }

    // ─── Admin: Sectors ───────────────────────────────────────────────────────

    public function storeSector(Request $request): JsonResponse
    {
        $this->validate($request, [
            'name'     => 'required|string|max:255',
            'capacity' => 'nullable|integer|min:0',
            'order'    => 'sometimes|integer|min:0',
        ]);

        $stadium = StadiumConfig::firstOrFail();

        $sector = $stadium->sectors()->create([
            'name'     => $request->input('name'),
            'capacity' => $request->input('capacity'),
            'order'    => $request->input('order', 0),
        ]);

        return response()->json(['data' => $sector], 201);
    }

    public function updateSector(Request $request, int $id): JsonResponse
    {
        $sector = StadiumSector::findOrFail($id);

        $this->validate($request, [
            'name'     => 'sometimes|string|max:255',
            'capacity' => 'nullable|integer|min:0',
            'order'    => 'sometimes|integer|min:0',
        ]);

        $sector->update($request->only(['name', 'capacity', 'order']));

        return response()->json(['data' => $sector]);
    }

    public function destroySector(int $id): JsonResponse
    {
        $sector = StadiumSector::findOrFail($id);
        $sector->delete();

        return response()->json(['message' => 'Sector eliminado'], 200);
    }
}
