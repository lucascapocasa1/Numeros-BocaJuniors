<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('election_commitments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('election_proposal_id')->constrained('election_proposals')->cascadeOnDelete();
            $table->text('description');
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('election_commitments');
    }
};
