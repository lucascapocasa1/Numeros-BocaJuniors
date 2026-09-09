<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('economy_records', function (Blueprint $table) {
            $table->date('carried_out_date')->nullable()->after('record_date');
        });

        DB::statement('UPDATE economy_records SET carried_out_date = record_date WHERE carried_out = 1');

        Schema::table('economy_records', function (Blueprint $table) {
            $table->dropColumn('carried_out');
        });
    }

    public function down(): void
    {
        Schema::table('economy_records', function (Blueprint $table) {
            $table->boolean('carried_out')->default(false)->after('record_date');
        });

        DB::statement('UPDATE economy_records SET carried_out = 1 WHERE carried_out_date IS NOT NULL');

        Schema::table('economy_records', function (Blueprint $table) {
            $table->dropColumn('carried_out_date');
        });
    }
};
