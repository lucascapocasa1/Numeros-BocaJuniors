<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Right;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RightController extends Controller
{
    private function enrichWithPlayerAvatar(array $right): array
    {
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
