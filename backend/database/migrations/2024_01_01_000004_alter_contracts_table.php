<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropIndex('contracts_signing_date_index');
            $table->dropColumn('signing_date');
            $table->string('external_id', 255)->nullable()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->date('signing_date')->after('id');
            $table->index('signing_date');
            $table->dropColumn('external_id');
        });
    }
};
