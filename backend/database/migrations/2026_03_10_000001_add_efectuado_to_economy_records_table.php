<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('economy_records', function (Blueprint $table) {
            $table->boolean('carried_out')->default(false)->after('official');
        });
    }

    public function down(): void
    {
        Schema::table('economy_records', function (Blueprint $table) {
            $table->dropColumn('carried_out');
        });
    }
};
