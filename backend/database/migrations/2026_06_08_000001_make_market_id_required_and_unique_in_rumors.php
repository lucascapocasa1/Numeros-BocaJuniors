<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('rumors')->whereNull('market_id')->delete();

        Schema::table('rumors', function (Blueprint $table) {
            $table->dropForeign('rumors_market_id_foreign');
        });

        DB::statement('ALTER TABLE rumors MODIFY COLUMN market_id BIGINT UNSIGNED NOT NULL');

        Schema::table('rumors', function (Blueprint $table) {
            $table->foreign('market_id')->references('id')->on('markets')->cascadeOnDelete();
            $table->unique(['external_id', 'market_id'], 'rumors_external_id_market_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('rumors', function (Blueprint $table) {
            $table->dropUnique('rumors_external_id_market_id_unique');
            $table->dropForeign('rumors_market_id_foreign');
        });

        DB::statement('ALTER TABLE rumors MODIFY COLUMN market_id BIGINT UNSIGNED NULL');

        Schema::table('rumors', function (Blueprint $table) {
            $table->foreign('market_id')->references('id')->on('markets')->nullOnDelete();
        });
    }
};
