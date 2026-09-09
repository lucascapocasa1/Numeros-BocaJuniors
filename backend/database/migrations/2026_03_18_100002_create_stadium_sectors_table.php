<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateStadiumSectorsTable extends Migration
{
    public function up(): void
    {
        Schema::create('stadium_sectors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stadium_config_id')->constrained('stadium_config')->onDelete('cascade');
            $table->string('name');
            $table->unsignedInteger('capacity')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stadium_sectors');
    }
}
