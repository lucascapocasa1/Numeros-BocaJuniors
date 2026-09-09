<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AddSectionSettings extends Migration
{
    public function up(): void
    {
        DB::table('settings')->insert([
            ['key' => 'section_economia_enabled', 'value' => '1', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['key' => 'section_contratos_enabled', 'value' => '1', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['key' => 'section_balances_enabled', 'value' => '1', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->whereIn('key', [
            'section_economia_enabled',
            'section_contratos_enabled',
            'section_balances_enabled',
        ])->delete();
    }
}
