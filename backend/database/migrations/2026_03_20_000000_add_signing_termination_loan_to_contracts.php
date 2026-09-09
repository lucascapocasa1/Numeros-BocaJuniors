<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->date('signing_date')->nullable()->after('expiration_date');
            $table->date('termination_date')->nullable()->after('signing_date');
            $table->json('loan')->nullable()->after('links');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn(['signing_date', 'termination_date', 'loan']);
        });
    }
};
