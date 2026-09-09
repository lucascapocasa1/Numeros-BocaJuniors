<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('election_lists', function (Blueprint $table) {
            $table->string('token', 40)->nullable()->unique()->after('id');
        });

        // Backfill tokens for lists created before this column existed.
        DB::table('election_lists')->whereNull('token')->orderBy('id')->get(['id'])->each(function ($list) {
            DB::table('election_lists')->where('id', $list->id)->update(['token' => bin2hex(random_bytes(16))]);
        });
    }

    public function down(): void
    {
        Schema::table('election_lists', function (Blueprint $table) {
            $table->dropColumn('token');
        });
    }
};
