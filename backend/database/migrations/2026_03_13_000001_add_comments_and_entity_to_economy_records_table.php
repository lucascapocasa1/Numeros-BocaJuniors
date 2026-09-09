<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('economy_records', function (Blueprint $table) {
            $table->text('comments')->nullable()->after('description');
            $table->string('entity', 255)->nullable()->after('comments');
        });
    }

    public function down(): void
    {
        Schema::table('economy_records', function (Blueprint $table) {
            $table->dropColumn(['comments', 'entity']);
        });
    }
};
