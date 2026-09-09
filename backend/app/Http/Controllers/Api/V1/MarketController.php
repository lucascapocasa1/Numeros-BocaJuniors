<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Market;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarketController extends Controller
{
    public function index(): JsonResponse
    {
        $markets = Market::withCount('rumors')->orderBy('created_at', 'desc')->get();

        return response()->json(['data' => $markets]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->validate($request, [
            'name' => 'required|string|max:255',
        ]);

        $market = Market::create([
            'name'      => $request->input('name'),
            'is_active' => false,
        ]);

        return response()->json(['data' => $market->loadCount('rumors')], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $market = Market::findOrFail($id);

        $this->validate($request, [
            'name' => 'sometimes|string|max:255',
        ]);

        $market->update($request->only(['name']));

        return response()->json(['data' => $market->loadCount('rumors')]);
    }

    public function destroy(int $id): JsonResponse
    {
        $market = Market::findOrFail($id);
        $market->delete();

        return response()->json(['message' => 'Mercado eliminado'], 200);
    }

    public function activate(int $id): JsonResponse
    {
        $market = Market::findOrFail($id);

        // Deactivate all markets
        Market::query()->update(['is_active' => false]);

        // Activate the selected one
        $market->update(['is_active' => true]);

        return response()->json(['data' => $market->loadCount('rumors')]);
    }

    public function deactivate(): JsonResponse
    {
        Market::query()->update(['is_active' => false]);

        return response()->json(['message' => 'Mercado activo quitado']);
    }
}
