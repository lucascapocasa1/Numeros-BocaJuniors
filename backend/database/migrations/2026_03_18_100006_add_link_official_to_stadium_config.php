<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddLinkOfficialToStadiumConfig extends Migration
{
    public function up(): void
    {
        Schema::table('stadium_config', function (Blueprint $table) {
            $table->boolean('link_official')->default(false)->after('link');
        });
    }

    public function down(): void
    {
        Schema::table('stadium_config', function (Blueprint $table) {
            $table->dropColumn('link_official');
        });
    }
}
