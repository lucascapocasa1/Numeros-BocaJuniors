<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddMarketIdToRumors extends Migration
{
    public function up(): void
    {
        Schema::table('rumors', function (Blueprint $table) {
            $table->foreignId('market_id')->nullable()->after('id')->constrained('markets')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('rumors', function (Blueprint $table) {
            $table->dropForeign(['market_id']);
            $table->dropColumn('market_id');
        });
    }
}
