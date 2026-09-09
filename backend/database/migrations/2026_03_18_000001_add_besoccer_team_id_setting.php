<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = Carbon::now();

        $existing = DB::table('settings')->where('key', 'besoccer_team_id')->exists();

        if (!$existing) {
            DB::table('settings')->insert([
                'key'        => 'besoccer_team_id',
                'value'      => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'besoccer_team_id')->delete();
    }
};
