<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AddSectionEstadioSetting extends Migration
{
    public function up(): void
    {
        DB::table('settings')->insert([
            ['key' => 'section_estadio_enabled', 'value' => '1', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->whereIn('key', ['section_estadio_enabled'])->delete();
    }
}
