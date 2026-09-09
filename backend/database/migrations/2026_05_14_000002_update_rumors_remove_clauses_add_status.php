<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rumors', function (Blueprint $table) {
            $table->dropColumn('clauses');
            $table->string('status')->default('rumor')->after('full_name');
        });
    }

    public function down(): void
    {
        Schema::table('rumors', function (Blueprint $table) {
            $table->dropColumn('status');
            $table->json('clauses')->nullable()->after('full_name');
        });
    }
};
