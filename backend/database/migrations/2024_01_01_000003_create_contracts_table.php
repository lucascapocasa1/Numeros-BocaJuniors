<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->date('signing_date');
            $table->date('expiration_date');
            $table->decimal('club_pass_percentage', 5, 2);
            $table->decimal('estimated_salary', 15, 2)->nullable();
            $table->enum('currency', ['ARS', 'USD', 'EUR'])->nullable();
            $table->boolean('official')->default(false);
            $table->json('clauses')->nullable();
            $table->json('links')->nullable();
            $table->timestamps();

            $table->index('full_name');
            $table->index('signing_date');
            $table->index('official');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
