<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateStadiumMatchesTable extends Migration
{
    public function up(): void
    {
        Schema::create('stadium_matches', function (Blueprint $table) {
            $table->id();
            $table->string('opponent');
            $table->date('match_date');
            $table->time('match_time')->nullable();
            $table->string('competition')->nullable();
            $table->boolean('is_home')->default(true);
            $table->timestamps();

            $table->index('match_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stadium_matches');
    }
}
