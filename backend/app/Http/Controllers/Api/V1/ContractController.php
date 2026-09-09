<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Services\BeSoccerService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContractController extends Controller
{
    private BeSoccerService $besoccerService;

    public function __construct(BeSoccerService $besoccerService)
    {
        $this->besoccerService = $besoccerService;
    }

    private function enrichWithPlayerAvatar(array $contract): array
    {
        if (!empty($contract['external_id'])) {
            $playerFull = $this->besoccerService->getPlayerData($contract['external_id']);
            if ($playerFull['success'] ?? false) {
                $defaultAvatar = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/default-avatar.svg';
                $data = $playerFull['data'];
                $contract['player_avatar'] = $data['player_avatar'] ?? $defaultAvatar;
                $pos1 = $data['pos1'] ?? null;
                $contract['positions'] = !empty($pos1) ? [['pos' => $pos1]] : [];
            }
        }
        return $contract;
    }

    public function index(Request $request): JsonResponse
    {
        $official = $request->has('official') ? filter_var($request->input('official'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

        $query = Contract::query()
            ->whereNull('parent_id')
            ->search($request->input('search'))
            ->externalId($request->input('external_id'))
            ->official($official)
            ->dateFrom($request->input('date_from'))
            ->dateTo($request->input('date_to'))
            ->expireFrom($request->input('expire_from'))
            ->expireTo($request->input('expire_to'))
            ->validity($request->input('validity'))
            ->status($request->input('status'))
            ->loan($request->input('loan'))
            ->currency($request->input('currency'));

        $allowedSortFields = ['expiration_date', 'signing_date', 'estimated_salary'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortFields)
            ? $request->input('sort_by')
            : 'expiration_date';
        $sortDir = in_array($request->input('sort_dir'), ['asc', 'desc'])
            ? $request->input('sort_dir')
            : 'desc';
        $query->orderBy($sortBy, $sortDir);

        $perPage = min((int) $request->input('per_page', 15), 100);
        $contracts = $query->paginate($perPage);

        // Enrich contracts with player avatars
        $contractsData = array_map(function ($contract) {
            return $this->enrichWithPlayerAvatar($contract->toArray());
        }, $contracts->items());

        // Aggregates
        $aggQuery = Contract::query()
            ->whereNull('parent_id')
            ->search($request->input('search'))
            ->externalId($request->input('external_id'))
            ->official($official)
            ->dateFrom($request->input('date_from'))
            ->dateTo($request->input('date_to'))
            ->expireFrom($request->input('expire_from'))
            ->expireTo($request->input('expire_to'))
            ->validity($request->input('validity'))
            ->status($request->input('status'))
            ->loan($request->input('loan'))
            ->currency($request->input('currency'));

        $now = Carbon::now();
        $totals = [
            'total_contratos'          => (int) (clone $aggQuery)->count(),
            'promedio_porcentaje_pase'  => round((float) (clone $aggQuery)->avg('club_pass_percentage'), 2),
            'total_salarios_usd'       => (float) (clone $aggQuery)->where('currency', 'USD')->sum('estimated_salary'),
            'total_salarios_ars'       => (float) (clone $aggQuery)->where('currency', 'ARS')->sum('estimated_salary'),
            'total_salarios_eur'       => (float) (clone $aggQuery)->where('currency', 'EUR')->sum('estimated_salary'),
            'contratos_vigentes'       => (int) (clone $aggQuery)->where('expiration_date', '>=', $now)
                                            ->where(function ($q) use ($now) {
                                                $q->whereNull('termination_date')
                                                  ->orWhere('termination_date', '>=', $now);
                                            })->count(),
            'contratos_vencidos'       => (int) (clone $aggQuery)->where(function ($q) use ($now) {
                                            $q->where('expiration_date', '<', $now)
                                              ->orWhere(function ($q2) use ($now) {
                                                  $q2->whereNotNull('termination_date')
                                                     ->where('termination_date', '<', $now);
                                              });
                                            })->count(),
            'jugadores_prestamo'       => (int) (clone $aggQuery)->whereNotNull('loan')->count(),
            'vencen_6_meses'           => (int) (clone $aggQuery)->whereNull('termination_date')
                                            ->where('expiration_date', '>=', $now)
                                            ->where('expiration_date', '<=', $now->copy()->addMonths(6))
                                            ->count(),
            'vencen_12_meses'          => (int) (clone $aggQuery)->whereNull('termination_date')
                                            ->where('expiration_date', '>=', $now)
                                            ->where('expiration_date', '<=', $now->copy()->addMonths(12))
                                            ->count(),
            'last_updated_at'          => Contract::max('created_at'),
        ];

        return response()->json([
            'data'    => $contractsData,
            'totals'  => $totals,
            'meta'    => [
                'current_page' => $contracts->currentPage(),
                'last_page'    => $contracts->lastPage(),
                'per_page'     => $contracts->perPage(),
                'total'        => $contracts->total(),
            ],
        ]);
    }

    public function stats(): JsonResponse
    {
        $now = Carbon::now();

        $base = Contract::query()->whereNull('parent_id')->where(function ($q) use ($now) {
            $q->whereNull('termination_date')
              ->orWhere('termination_date', '>=', $now);
        })->where('expiration_date', '>=', $now);

        return response()->json([
            'data' => [
                'total_contratos'    => (int) (clone $base)->count(),
                'jugadores_prestamo' => (int) (clone $base)->whereNotNull('loan')->count(),
                'vencen_6_meses'     => (int) (clone $base)->whereNull('termination_date')
                                            ->where('expiration_date', '<=', $now->copy()->addMonths(6))
                                            ->count(),
                'vencen_12_meses'    => (int) (clone $base)->whereNull('termination_date')
                                            ->where('expiration_date', '<=', $now->copy()->addMonths(12))
                                            ->count(),
            ],
        ]);
    }

    public function recentMoves(): JsonResponse
    {
        $fiveMonthsAgo = Carbon::now()->subMonths(5)->startOfDay();

        $altasPorFirma = Contract::query()
            ->whereNull('parent_id')
            ->whereNotNull('signing_date')
            ->where('signing_date', '>=', $fiveMonthsAgo)
            ->get()
            ->map(fn($c) => array_merge($this->enrichWithPlayerAvatar($c->toArray()), ['tipo' => 'alta']));

        $altasPorRegresoDePrestamo = Contract::query()
            ->whereNull('parent_id')
            ->whereNotNull('loan_return_date')
            ->where('loan_return_date', '>=', $fiveMonthsAgo)
            ->get()
            ->map(fn($c) => array_merge($this->enrichWithPlayerAvatar($c->toArray()), ['tipo' => 'alta']));

        $altas = $altasPorFirma
            ->concat($altasPorRegresoDePrestamo)
            ->sortByDesc(fn($c) => $c['signing_date'] ?? $c['loan_return_date'])
            ->values()
            ->toArray();

        $bajasPorTerminacion = Contract::query()
            ->whereNull('parent_id')
            ->whereNotNull('termination_date')
            ->where('termination_date', '>=', $fiveMonthsAgo)
            ->get()
            ->map(fn($c) => array_merge($this->enrichWithPlayerAvatar($c->toArray()), ['tipo' => 'baja']));

        $bajasPorPrestamo = Contract::query()
            ->whereNull('parent_id')
            ->whereNotNull('loan_date')
            ->where('loan_date', '>=', $fiveMonthsAgo)
            ->get()
            ->map(fn($c) => array_merge($this->enrichWithPlayerAvatar($c->toArray()), ['tipo' => 'baja']));

        $bajas = $bajasPorTerminacion
            ->concat($bajasPorPrestamo)
            ->sortByDesc(fn($c) => $c['termination_date'] ?? $c['loan_date'])
            ->values()
            ->toArray();

        return response()->json([
            'data' => [
                'altas' => $altas,
                'bajas' => $bajas,
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $contract = Contract::findOrFail($id);
        $contractData = $this->enrichWithPlayerAvatar($contract->toArray());

        $history = $contract->children()
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn($c) => $c->toArray())
            ->toArray();

        return response()->json([
            'data'    => $contractData,
            'history' => $history,
        ]);
    }

    public function saveAsChange(Request $request, int $id): JsonResponse
    {
        $contract = Contract::findOrFail($id);

        $this->validate($request, [
            'external_id'          => 'nullable|string|max:255',
            'full_name'            => 'sometimes|string|max:255',
            'expiration_date'      => 'sometimes|date',
            'signing_date'         => 'nullable|date',
            'termination_date'     => 'nullable|date',
            'club_pass_percentage' => 'sometimes|numeric|min:0|max:100',
            'estimated_salary'     => 'nullable|numeric|min:0',
            'currency'             => 'nullable|in:ARS,USD,EUR',
            'clauses'              => 'nullable|array',
            'links'                => 'nullable|array',
            'links.*.url'          => 'required|url',
            'links.*.official'     => 'required|boolean',
            'loan'                 => 'nullable|array',
            'loan.club'            => 'required_with:loan|string|max:255',
            'loan.until'           => 'nullable|date',
            'loan.clauses'         => 'nullable|array',
            'loan_date'            => 'nullable|date',
            'loan_return_date'     => 'nullable|date',
        ]);

        // Snapshot current state as a historical child row
        Contract::create([
            'parent_id'            => $contract->id,
            'external_id'          => $contract->external_id,
            'full_name'            => $contract->full_name,
            'expiration_date'      => $contract->expiration_date?->toDateString(),
            'signing_date'         => $contract->signing_date?->toDateString(),
            'termination_date'     => $contract->termination_date?->toDateString(),
            'club_pass_percentage' => $contract->club_pass_percentage,
            'estimated_salary'     => $contract->estimated_salary,
            'currency'             => $contract->currency,
            'clauses'              => $contract->clauses,
            'links'                => $contract->links,
            'loan'                 => $contract->loan,
            'loan_date'            => $contract->loan_date?->toDateString(),
            'loan_return_date'     => $contract->loan_return_date?->toDateString(),
        ]);

        // Apply new data to the parent contract
        $contract->update($request->only([
            'external_id', 'full_name', 'expiration_date', 'signing_date', 'termination_date',
            'club_pass_percentage', 'estimated_salary', 'currency',
            'clauses', 'links', 'loan', 'loan_date', 'loan_return_date',
        ]));

        return response()->json(['data' => $contract->fresh()]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->validate($request, [
            'external_id'            => 'nullable|string|max:255',
            'full_name'               => 'required|string|max:255',
            'expiration_date'        => 'required|date',
            'signing_date'           => 'nullable|date',
            'termination_date'       => 'nullable|date',
            'club_pass_percentage'    => 'required|numeric|min:0|max:100',
            'estimated_salary'        => 'nullable|numeric|min:0',
            'currency'                => 'nullable|in:ARS,USD,EUR',
            'clauses'                => 'nullable|array',
            'links'                   => 'nullable|array',
            'links.*.url'             => 'required|url',
            'links.*.official'        => 'required|boolean',
            'loan'                    => 'nullable|array',
            'loan.club'               => 'required_with:loan|string|max:255',
            'loan.until'              => 'nullable|date',
            'loan.clauses'            => 'nullable|array',
        ]);

        $contract = Contract::create($request->only([
            'external_id', 'full_name', 'expiration_date', 'signing_date', 'termination_date',
            'club_pass_percentage', 'estimated_salary', 'currency',
            'clauses', 'links', 'loan',
        ]));

        return response()->json(['data' => $contract], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $contract = Contract::findOrFail($id);

        $this->validate($request, [
            'external_id'            => 'nullable|string|max:255',
            'full_name'               => 'sometimes|string|max:255',
            'expiration_date'        => 'sometimes|date',
            'signing_date'           => 'nullable|date',
            'termination_date'       => 'nullable|date',
            'club_pass_percentage'    => 'sometimes|numeric|min:0|max:100',
            'estimated_salary'        => 'nullable|numeric|min:0',
            'currency'                => 'nullable|in:ARS,USD,EUR',
            'clauses'                => 'nullable|array',
            'links'                   => 'nullable|array',
            'links.*.url'             => 'required|url',
            'links.*.official'        => 'required|boolean',
            'loan'                    => 'nullable|array',
            'loan.club'               => 'required_with:loan|string|max:255',
            'loan.until'              => 'nullable|date',
            'loan.clauses'            => 'nullable|array',
        ]);

        $contract->update($request->only([
            'external_id', 'full_name', 'expiration_date', 'signing_date', 'termination_date',
            'club_pass_percentage', 'estimated_salary', 'currency',
            'clauses', 'links', 'loan',
        ]));

        return response()->json(['data' => $contract]);
    }

    public function destroy(int $id): JsonResponse
    {
        $contract = Contract::findOrFail($id);
        $contract->delete();

        return response()->json(['message' => 'Contrato eliminado'], 200);
    }
}
