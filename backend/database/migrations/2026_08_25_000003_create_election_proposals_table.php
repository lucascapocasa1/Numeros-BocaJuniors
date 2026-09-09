<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('election_proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('election_list_id')->constrained('election_lists')->cascadeOnDelete();
            $table->string('title');
            $table->text('description');
            $table->string('unit')->nullable();
            $table->decimal('unit_value', 15, 2)->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('election_proposals');
    }
};
