<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('economy_records', function (Blueprint $table) {
            $table->id();
            $table->text('description');
            $table->enum('type', ['cobro', 'pago']);
            $table->decimal('amount', 15, 2);
            $table->enum('currency', ['ARS', 'USD', 'EUR'])->default('ARS');
            $table->date('record_date');
            $table->boolean('official')->default(false);
            $table->json('links')->nullable();
            $table->timestamps();

            $table->index('type');
            $table->index('record_date');
            $table->index('official');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('economy_records');
    }
};
