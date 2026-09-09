<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('election_proposals', function (Blueprint $table) {
            $table->dropColumn(['unit', 'unit_value']);
        });
    }

    public function down(): void
    {
        Schema::table('election_proposals', function (Blueprint $table) {
            $table->string('unit')->nullable();
            $table->decimal('unit_value', 15, 2)->nullable();
        });
    }
};
