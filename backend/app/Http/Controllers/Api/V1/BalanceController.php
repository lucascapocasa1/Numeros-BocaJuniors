<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Balance;
use App\Models\BalanceLine;
use App\Models\Setting;
use App\Services\OpenAiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BalanceController extends Controller
{
    public function index(): JsonResponse
    {
        $balances = Balance::orderBy('published_at', 'desc')
            ->orderBy('exercise', 'desc')
            ->get()
            ->map(function (Balance $balance) {
                return [
                    'id'                 => $balance->id,
                    'exercise'           => $balance->exercise,
                    'dollar_reference'   => (float) $balance->dollar_reference,
                    'published_at'       => $balance->published_at?->toDateString(),
                    'has_file'           => !empty($balance->file_path),
                    'file_original_name' => $balance->file_original_name,
                    'created_at'         => $balance->created_at->toDateTimeString(),
                ];
            });

        return response()->json(['data' => $balances]);
    }

    public function show(int $id): JsonResponse
    {
        $balance = Balance::findOrFail($id);

        // Flat query + PHP tree assembly (handles any depth, single DB round-trip)
        $allLines = BalanceLine::where('balance_id', $id)->orderBy('order')->get();

        $map   = [];
        $roots = [];

        foreach ($allLines as $line) {
            $map[$line->id] = [
                'id'              => $line->id,
                'parent_id'       => $line->parent_id,
                'name'            => $line->name,
                'normalized_name' => $line->normalized_name,
                'level'           => $line->level,
                'order'           => $line->order,
                'amount'          => $line->amount !== null ? (float) $line->amount : null,
                'currency'        => $line->currency,
                'is_total'        => (bool) $line->is_total,
                'path'            => $line->path,
                'children'        => [],
            ];
        }

        foreach ($map as $lineId => &$node) {
            if ($node['parent_id'] === null) {
                $roots[] = &$node;
            } elseif (isset($map[$node['parent_id']])) {
                $map[$node['parent_id']]['children'][] = &$node;
            }
        }
        unset($node);

        return response()->json([
            'data' => [
                'id'                 => $balance->id,
                'exercise'           => $balance->exercise,
                'dollar_reference'   => (float) $balance->dollar_reference,
                'published_at'       => $balance->published_at?->toDateString(),
                'has_file'           => !empty($balance->file_path),
                'file_original_name' => $balance->file_original_name,
                'lines'              => $roots,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->validate($request, [
            'exercise'         => 'required|string|max:50',
            'dollar_reference' => 'nullable|numeric|min:0',
            'published_at'     => 'nullable|date',
            'file'             => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:20480',
        ]);

        $filePath         = null;
        $fileOriginalName = null;

        if ($request->hasFile('file') && $request->file('file')->isValid()) {
            $file             = $request->file('file');
            $fileOriginalName = $file->getClientOriginalName();
            $filePath         = $this->storeFile($file);
        }

        $balance = Balance::create([
            'exercise'           => $request->input('exercise'),
            'dollar_reference'   => $request->input('dollar_reference'),
            'published_at'       => $request->input('published_at'),
            'file_path'          => $filePath,
            'file_original_name' => $fileOriginalName,
        ]);

        return response()->json(['data' => $balance], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $balance = Balance::findOrFail($id);

        $this->validate($request, [
            'exercise'         => 'sometimes|string|max:50',
            'dollar_reference' => 'nullable|numeric|min:0',
            'published_at'     => 'nullable|date',
            'file'             => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:20480',
        ]);

        if ($request->hasFile('file') && $request->file('file')->isValid()) {
            if ($balance->file_path) {
                Storage::disk('local')->delete($balance->file_path);
            }
            $file = $request->file('file');
            $balance->file_original_name = $file->getClientOriginalName();
            $balance->file_path          = $this->storeFile($file);
        }

        $balance->fill($request->only(['exercise', 'dollar_reference', 'published_at']));
        $balance->save();

        return response()->json(['data' => $balance]);
    }

    public function destroy(int $id): JsonResponse
    {
        $balance = Balance::findOrFail($id);

        if ($balance->file_path) {
            Storage::disk('local')->delete($balance->file_path);
        }

        $balance->delete();

        return response()->json(['message' => 'Balance eliminado'], 200);
    }

    public function download(int $id)
    {
        $balance = Balance::findOrFail($id);

        if (!$balance->file_path || !Storage::disk('local')->exists($balance->file_path)) {
            return response()->json(['error' => 'Archivo no disponible'], 404);
        }

        $path     = Storage::disk('local')->path($balance->file_path);
        $fileName = $balance->file_original_name ?: basename($balance->file_path);

        return response()->download($path, $fileName);
    }

    // --------------------------------------------------------
    // AI Analysis (single stage)
    // --------------------------------------------------------

    public function analyze(int $id): JsonResponse
    {
        $balance = Balance::findOrFail($id);

        if (!$balance->file_path || !Storage::disk('local')->exists($balance->file_path)) {
            return response()->json(['error' => 'El balance no tiene archivo adjunto'], 422);
        }

        $service = new OpenAiService();
        $result  = $service->analyzeBalance($balance);

        return response()->json(['data' => $result]);
    }

    /**
     * Apply the AI-generated hierarchical tree to the balance.
     * Receives the confirmed `data` array and persists it.
     */
    public function applyAnalysis(Request $request, int $id): JsonResponse
    {
        $balance = Balance::findOrFail($id);

        $this->validate($request, [
            'data' => 'required|array',
        ]);

        $service = new OpenAiService();
        $service->persistLines($balance, $request->input('data'));

        return $this->show($id);
    }

    // --------------------------------------------------------
    // Balance lines CRUD (manual editing)
    // --------------------------------------------------------

    public function storeLine(Request $request, int $balanceId): JsonResponse
    {
        Balance::findOrFail($balanceId);

        $this->validate($request, [
            'parent_id' => 'nullable|exists:balance_lines,id',
            'name'      => 'required|string|max:255',
            'amount'    => 'nullable|numeric',
            'currency'  => 'nullable|in:ARS,USD,EUR',
            'is_total'  => 'nullable|boolean',
        ]);

        $parentId   = $request->input('parent_id');
        $level      = 1;
        $parentPath = '';

        if ($parentId) {
            $parent     = BalanceLine::findOrFail($parentId);
            $level      = $parent->level + 1;
            $parentPath = $parent->path ?? '';
        }

        $name  = $request->input('name');
        $path  = $parentPath ? ($parentPath . ' > ' . $name) : $name;
        $order = BalanceLine::where('balance_id', $balanceId)
            ->where('parent_id', $parentId)
            ->max('order') + 1;

        $line = BalanceLine::create([
            'balance_id'      => $balanceId,
            'parent_id'       => $parentId,
            'name'            => $name,
            'normalized_name' => BalanceLine::normalizeName($name),
            'level'           => $level,
            'order'           => $order,
            'amount'          => $request->input('amount'),
            'currency'        => $request->input('currency', 'ARS'),
            'is_total'        => $request->boolean('is_total', false),
            'path'            => $path,
        ]);

        return response()->json(['data' => $line], 201);
    }

    public function updateLine(Request $request, int $balanceId, int $lineId): JsonResponse
    {
        Balance::findOrFail($balanceId);
        $line = BalanceLine::where('balance_id', $balanceId)->findOrFail($lineId);

        $this->validate($request, [
            'name'      => 'sometimes|string|max:255',
            'amount'    => 'nullable|numeric',
            'currency'  => 'nullable|in:ARS,USD,EUR',
            'is_total'  => 'nullable|boolean',
            'parent_id' => 'sometimes|nullable|integer',
        ]);

        if ($request->has('name')) {
            $line->name            = $request->input('name');
            $line->normalized_name = BalanceLine::normalizeName($request->input('name'));
        }
        if ($request->has('amount')) {
            $line->amount = $request->input('amount');
        }
        if ($request->has('currency')) {
            $line->currency = $request->input('currency');
        }
        if ($request->has('is_total')) {
            $line->is_total = $request->boolean('is_total');
        }
        if ($request->has('parent_id')) {
            $newParentId = $request->input('parent_id');

            if ($newParentId !== null) {
                $newParentId = (int) $newParentId;
                // Validate new parent belongs to same balance
                $newParent = BalanceLine::where('balance_id', $balanceId)->findOrFail($newParentId);
                // Prevent cycles: new parent cannot be a descendant of the line being moved
                if (in_array($newParentId, $this->getDescendantIds($line->id, $balanceId))) {
                    return response()->json(['error' => 'No se puede mover una línea dentro de sus propios hijos'], 422);
                }
                $newLevel = $newParent->level + 1;
            } else {
                $newLevel = 1;
            }

            // Place at the end of the new parent's children
            $maxOrder = BalanceLine::where('balance_id', $balanceId)
                ->where('parent_id', $newParentId)
                ->where('id', '!=', $line->id)
                ->max('order') ?? -1;

            $levelDiff = $newLevel - $line->level;
            $line->parent_id = $newParentId;
            $line->level     = $newLevel;
            $line->order     = $maxOrder + 1;

            if ($levelDiff !== 0) {
                $this->updateDescendantLevels($line->id, $levelDiff, $balanceId);
            }
        }

        $line->save();

        return response()->json(['data' => $line]);
    }

    private function getDescendantIds(int $lineId, int $balanceId): array
    {
        $ids      = [];
        $children = BalanceLine::where('balance_id', $balanceId)->where('parent_id', $lineId)->get();
        foreach ($children as $child) {
            $ids[] = $child->id;
            $ids   = array_merge($ids, $this->getDescendantIds($child->id, $balanceId));
        }
        return $ids;
    }

    private function updateDescendantLevels(int $parentId, int $levelDiff, int $balanceId): void
    {
        $children = BalanceLine::where('balance_id', $balanceId)->where('parent_id', $parentId)->get();
        foreach ($children as $child) {
            $child->level = $child->level + $levelDiff;
            $child->save();
            $this->updateDescendantLevels($child->id, $levelDiff, $balanceId);
        }
    }

    public function destroyLine(int $balanceId, int $lineId): JsonResponse
    {
        Balance::findOrFail($balanceId);
        $line = BalanceLine::where('balance_id', $balanceId)->findOrFail($lineId);
        $line->delete(); // cascades to children

        return response()->json(['message' => 'Línea eliminada'], 200);
    }

    public function reorderLines(Request $request, int $balanceId): JsonResponse
    {
        Balance::findOrFail($balanceId);

        $this->validate($request, [
            'items'         => 'required|array',
            'items.*.id'    => 'required|integer|exists:balance_lines,id',
            'items.*.order' => 'required|integer|min:0',
        ]);

        foreach ($request->input('items') as $item) {
            BalanceLine::where('balance_id', $balanceId)
                ->where('id', $item['id'])
                ->update(['order' => $item['order']]);
        }

        return response()->json(['message' => 'Orden actualizado'], 200);
    }

    // --------------------------------------------------------
    // All balance items for admin selector (admin)
    // --------------------------------------------------------

    public function allBalanceItems(): JsonResponse
    {
        $items = BalanceLine::whereNotNull('normalized_name')
            ->whereNotNull('amount')
            ->selectRaw('normalized_name, MIN(name) as name, COUNT(DISTINCT balance_id) as balance_count')
            ->groupBy('normalized_name')
            ->orderByRaw('MIN(name)')
            ->get()
            ->map(fn($l) => ['id' => $l->normalized_name, 'name' => $l->name, 'balance_count' => (int) $l->balance_count]);

        return response()->json(['data' => $items]);
    }

    // --------------------------------------------------------
    // Evolution chart data (public)
    // --------------------------------------------------------

    public function evolution(): JsonResponse
    {
        $balances = Balance::orderBy('published_at')->orderBy('exercise')->get();

        if ($balances->isEmpty()) {
            return response()->json(['data' => ['exercises' => [], 'series' => []]]);
        }

        $balancesById = $balances->keyBy('id');

        // Determine which lines to include based on admin configuration
        $filterItemsSetting = Setting::get('balance_chart_filter_items');
        $filterItemsArray   = $filterItemsSetting ? json_decode($filterItemsSetting, true) : null;

        $linesQuery = BalanceLine::whereIn('balance_id', $balances->pluck('id'))
            ->whereNotNull('normalized_name')
            ->whereNotNull('amount');

        if ($filterItemsArray !== null) {
            $linesQuery->whereIn('normalized_name', $filterItemsArray);
        } else {
            // Default: only is_total lines
            $linesQuery->where('is_total', true);
        }

        $rootLines = $linesQuery->get();

        $exercises = $balances->pluck('exercise')->toArray();

        // Build series map: normalized_name => { name, values_by_balance_id }
        // Values are converted from ARS to USD using each balance's dollar_reference
        $seriesMap = [];
        foreach ($rootLines as $line) {
            $key = $line->normalized_name;
            if (!isset($seriesMap[$key])) {
                $seriesMap[$key] = ['name' => $line->name, 'values_by_balance' => []];
            }
            $dollarRef = (float) ($balancesById[$line->balance_id]->dollar_reference ?? 0);
            $amountUsd = $dollarRef > 0 ? (float) $line->amount / $dollarRef : 0;
            $seriesMap[$key]['values_by_balance'][$line->balance_id] =
                ($seriesMap[$key]['values_by_balance'][$line->balance_id] ?? 0) + $amountUsd;
        }

        // Load admin-configured default active items (null means all are active)
        $defaultItemsSetting = Setting::get('balance_chart_default_items');
        $defaultItemsArray   = $defaultItemsSetting ? json_decode($defaultItemsSetting, true) : null;

        // Load admin-configured short label overrides
        $labelOverridesSetting = Setting::get('balance_chart_label_overrides');
        $labelOverridesMap     = $labelOverridesSetting ? json_decode($labelOverridesSetting, true) : [];

        $series = [];
        foreach ($seriesMap as $key => $s) {
            $values = [];
            foreach ($balances as $balance) {
                $values[] = round($s['values_by_balance'][$balance->id] ?? 0, 2);
            }
            if (array_sum(array_map('abs', $values)) > 0) {
                $shortName = !empty($labelOverridesMap[$key]) ? $labelOverridesMap[$key] : null;
                $series[] = [
                    'id'             => $key,
                    'name'           => $s['name'],
                    'short_name'     => $shortName,
                    'values'         => $values,
                    'default_active' => $defaultItemsArray === null || in_array($key, $defaultItemsArray),
                ];
            }
        }

        return response()->json([
            'data' => [
                'exercises' => $exercises,
                'currency'  => 'USD',
                'series'    => $series,
            ],
        ]);
    }

    // --------------------------------------------------------
    // Private helpers
    // --------------------------------------------------------

    private function storeFile(\Illuminate\Http\UploadedFile $file): string
    {
        Storage::disk('local')->makeDirectory('balances');

        $path = $file->store('balances', 'local');

        if ($path === false || $path === '') {
            throw new \RuntimeException('No se pudo guardar el archivo. Verificá los permisos del directorio de almacenamiento.');
        }

        return $path;
    }
}
