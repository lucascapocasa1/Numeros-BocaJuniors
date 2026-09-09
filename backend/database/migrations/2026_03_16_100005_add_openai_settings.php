<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = Carbon::now();

        $existing = DB::table('settings')->whereIn('key', ['openai_api_key', 'openai_model'])->pluck('key')->toArray();

        $toInsert = [];
        if (!in_array('openai_api_key', $existing)) {
            $toInsert[] = ['key' => 'openai_api_key', 'value' => null, 'created_at' => $now, 'updated_at' => $now];
        }
        if (!in_array('openai_model', $existing)) {
            $toInsert[] = ['key' => 'openai_model', 'value' => 'gpt-4o', 'created_at' => $now, 'updated_at' => $now];
        }

        if (!empty($toInsert)) {
            DB::table('settings')->insert($toInsert);
        }
    }

    public function down(): void
    {
        DB::table('settings')->whereIn('key', ['openai_api_key', 'openai_model'])->delete();
    }
};
