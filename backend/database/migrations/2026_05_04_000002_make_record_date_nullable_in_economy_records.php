<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('economy_records', function (Blueprint $table) {
            $table->date('record_date')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('economy_records', function (Blueprint $table) {
            $table->date('record_date')->nullable(false)->change();
        });
    }
};
