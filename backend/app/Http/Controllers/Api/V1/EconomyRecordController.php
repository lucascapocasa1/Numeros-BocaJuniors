<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EconomyRecord;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EconomyRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $official   = $request->has('official')    ? filter_var($request->input('official'),    FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
        $carriedOut = $request->has('carried_out') ? filter_var($request->input('carried_out'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
        $overdue    = $request->has('overdue')     ? filter_var($request->input('overdue'),     FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

        $query = EconomyRecord::query()
            ->search($request->input('search'))
            ->official($official)
            ->type($request->input('type'))
            ->currency($request->input('currency'))
            ->dateFrom($request->input('date_from'))
            ->dateTo($request->input('date_to'))
            ->carriedOut($carriedOut)
            ->overdue($overdue);

        $sortDir = in_array(strtolower($request->input('sort_dir', 'desc')), ['asc', 'desc'])
            ? strtolower($request->input('sort_dir', 'desc'))
            : 'desc';
        $sortBy = in_array($request->input('sort_by', 'record_date'), ['record_date', 'amount'])
            ? $request->input('sort_by', 'record_date')
            : 'record_date';

        if ($sortBy === 'amount') {
            $query->orderBy('amount', $sortDir);
        } else {
            $query->orderByRaw("(record_date IS NULL) DESC, record_date {$sortDir}");
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $records = $query->paginate($perPage);

        // Aggregates
        $aggregateQuery = EconomyRecord::query()
            ->type($request->input('type'))
            ->currency($request->input('currency'))
            ->dateFrom($request->input('date_from'))
            ->dateTo($request->input('date_to'))
            ->carriedOut($carriedOut)
            ->overdue($overdue)
            ->official($official);

        $totals = [
            'total_cobros_ars' => (float) (clone $aggregateQuery)->where('type', 'cobro')->where('currency', 'ARS')->sum('amount'),
            'total_pagos_ars'  => (float) (clone $aggregateQuery)->where('type', 'pago')->where('currency', 'ARS')->sum('amount'),
            'total_cobros_usd' => (float) (clone $aggregateQuery)->where('type', 'cobro')->where('currency', 'USD')->sum('amount'),
            'total_pagos_usd'  => (float) (clone $aggregateQuery)->where('type', 'pago')->where('currency', 'USD')->sum('amount'),
            'total_cobros_eur' => (float) (clone $aggregateQuery)->where('type', 'cobro')->where('currency', 'EUR')->sum('amount'),
            'total_pagos_eur'  => (float) (clone $aggregateQuery)->where('type', 'pago')->where('currency', 'EUR')->sum('amount'),
            'balance_ars'      => 0,
            'balance_usd'      => 0,
            'balance_eur'      => 0,
            'cantidad'         => (int) (clone $aggregateQuery)->count(),
        ];

        $totals['balance_ars']     = $totals['total_cobros_ars'] - $totals['total_pagos_ars'];
        $totals['balance_usd']     = $totals['total_cobros_usd'] - $totals['total_pagos_usd'];
        $totals['balance_eur']     = $totals['total_cobros_eur'] - $totals['total_pagos_eur'];
        $totals['last_updated_at'] = EconomyRecord::max('created_at');

        return response()->json([
            'data'    => $records->items(),
            'totals'  => $totals,
            'meta'    => [
                'current_page' => $records->currentPage(),
                'last_page'    => $records->lastPage(),
                'per_page'     => $records->perPage(),
                'total'        => $records->total(),
            ],
        ]);
    }

    public function monthlySummary(): JsonResponse
    {
        $today = Carbon::today();
        $from  = $today->copy()->subMonths(24)->startOfMonth();
        $to    = $today->copy()->addMonths(24)->endOfMonth();

        $rows = EconomyRecord::query()
            ->select(
                DB::raw("DATE_FORMAT(record_date, '%Y-%m') AS month_key"),
                DB::raw("YEAR(record_date) AS year"),
                DB::raw("MONTH(record_date) AS month_num"),
                'currency',
                'type',
                DB::raw('SUM(amount) AS total')
            )
            ->whereBetween('record_date', [$from->toDateString(), $to->toDateString()])
            ->groupBy('month_key', 'year', 'month_num', 'currency', 'type')
            ->orderBy('month_key')
            ->get();

        // Build a map of all months in range (past 24 + next 24)
        $months = [];
        $cursor = $from->copy();
        while ($cursor->lte($to)) {
            $key = $cursor->format('Y-m');
            $months[$key] = [
                'month'         => $key,
                'year'          => (int) $cursor->year,
                'month_num'     => (int) $cursor->month,
                'month_label'   => $cursor->locale('es')->isoFormat('MMM YY'),
                'ingresos_ars'  => 0.0,
                'egresos_ars'   => 0.0,
                'ingresos_usd'  => 0.0,
                'egresos_usd'   => 0.0,
                'ingresos_eur'  => 0.0,
                'egresos_eur'   => 0.0,
                'balance_ars'   => 0.0,
                'balance_usd'   => 0.0,
                'balance_eur'   => 0.0,
            ];
            $cursor->addMonth();
        }

        foreach ($rows as $row) {
            $key = $row->month_key;
            if (!isset($months[$key])) {
                continue;
            }
            $currency = strtolower($row->currency);
            $field    = $row->type === 'cobro' ? "ingresos_{$currency}" : "egresos_{$currency}";
            $months[$key][$field] += (float) $row->total;
        }

        // Compute balances
        foreach ($months as &$m) {
            $m['balance_ars'] = $m['ingresos_ars'] - $m['egresos_ars'];
            $m['balance_usd'] = $m['ingresos_usd'] - $m['egresos_usd'];
            $m['balance_eur'] = $m['ingresos_eur'] - $m['egresos_eur'];
        }
        unset($m);

        return response()->json(['data' => array_values($months)]);
    }

    public function overdueEvolution(): JsonResponse
    {
        $today = Carbon::today();
        $from  = $today->copy()->subYears(4)->startOfMonth();

        // Records that are unconfirmed or were confirmed late.
        // Records without record_date are included using created_at as their start.
        $records = EconomyRecord::query()
            ->where(function ($q) use ($from) {
                // confirmed before our window started → contributes nothing
                $q->whereNull('carried_out_date')
                  ->orWhere('carried_out_date', '>=', $from->toDateString());
            })
            ->where(function ($q) {
                // never confirmed, or confirmed > 1 month after due date (only applicable when record_date exists)
                $q->whereNull('carried_out_date')
                  ->orWhereRaw('carried_out_date > DATE_ADD(record_date, INTERVAL 1 MONTH)');
            })
            ->get(['type', 'amount', 'currency', 'record_date', 'carried_out_date', 'created_at']);

        // Build month buckets
        $months = [];
        $cursor = $from->copy();
        while ($cursor->lte($today)) {
            $key = $cursor->format('Y-m');
            $months[$key] = [
                'month'       => $key,
                'month_label' => $cursor->locale('es')->isoFormat('MMM YY'),
                '_last_day'   => $cursor->copy()->endOfMonth()->toDateString(),
                'egresos_ars' => 0.0,
                'egresos_usd' => 0.0,
                'egresos_eur' => 0.0,
                'ingresos_ars' => 0.0,
                'ingresos_usd' => 0.0,
                'ingresos_eur' => 0.0,
            ];
            $cursor->addMonth();
        }

        foreach ($records as $record) {
            $recordDate    = $record->record_date
                ? Carbon::parse($record->record_date)
                : Carbon::parse($record->created_at)->startOfMonth();
            $confirmedDate = $record->carried_out_date ? Carbon::parse($record->carried_out_date) : null;
            $currency      = strtolower($record->currency);
            $field         = $record->type === 'cobro' ? "ingresos_{$currency}" : "egresos_{$currency}";
            $amount        = (float) $record->amount;

            foreach ($months as $key => &$month) {
                $lastDay = Carbon::parse($month['_last_day']);
                // Must be due by end of this month
                if ($recordDate->gt($lastDay)) {
                    continue;
                }
                // Must still be unconfirmed at end of this month
                if ($confirmedDate !== null && $confirmedDate->lte($lastDay)) {
                    continue;
                }
                $month[$field] += $amount;
            }
            unset($month);
        }

        $result = array_values(array_map(function ($m) {
            unset($m['_last_day']);
            return $m;
        }, $months));

        return response()->json(['data' => $result]);
    }

    public function show(int $id): JsonResponse
    {
        $record = EconomyRecord::findOrFail($id);

        return response()->json(['data' => $record]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->validate($request, [
            'description'      => 'required|string',
            'type'             => 'required|in:cobro,pago',
            'amount'           => 'required|numeric|min:0',
            'currency'         => 'required|in:ARS,USD,EUR',
            'record_date'      => 'nullable|date',
            'carried_out_date' => 'nullable|date',
            'entity'           => 'nullable|string',
            'comments'         => 'nullable|string',
            'links'            => 'nullable|array',
            'links.*.url'      => 'required|url',
            'links.*.official' => 'required|boolean',
        ]);

        $record = EconomyRecord::create($request->only([
            'description', 'type', 'amount', 'currency',
            'record_date', 'carried_out_date', 'entity', 'comments', 'links',
        ]));

        return response()->json(['data' => $record], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = EconomyRecord::findOrFail($id);

        $this->validate($request, [
            'description'      => 'sometimes|string',
            'type'             => 'sometimes|in:cobro,pago',
            'amount'           => 'sometimes|numeric|min:0',
            'currency'         => 'sometimes|in:ARS,USD,EUR',
            'record_date'      => 'nullable|date',
            'carried_out_date' => 'nullable|date',
            'entity'           => 'nullable|string',
            'comments'         => 'nullable|string',
            'links'            => 'nullable|array',
            'links.*.url'      => 'required|url',
            'links.*.official' => 'required|boolean',
        ]);

        $record->update($request->only([
            'description', 'type', 'amount', 'currency',
            'record_date', 'carried_out_date', 'entity', 'comments', 'links',
        ]));

        return response()->json(['data' => $record]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = EconomyRecord::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Registro eliminado'], 200);
    }
}
