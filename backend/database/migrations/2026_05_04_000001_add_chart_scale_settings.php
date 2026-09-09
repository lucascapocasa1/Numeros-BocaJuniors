<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AddChartScaleSettings extends Migration
{
    public function up(): void
    {
        $now = Carbon::now();
        DB::table('settings')->insert([
            ['key' => 'chart_scale_usd', 'value' => null, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'chart_scale_eur', 'value' => null, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'chart_scale_ars', 'value' => null, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->whereIn('key', ['chart_scale_usd', 'chart_scale_eur', 'chart_scale_ars'])->delete();
    }
}
