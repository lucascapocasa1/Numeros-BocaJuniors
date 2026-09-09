<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('balance_breakdowns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('balance_id')->constrained('balances')->onDelete('cascade');
            $table->foreignId('balance_item_id')->constrained('balance_items')->onDelete('cascade');
            $table->foreignId('balance_subitem_id')->nullable()->constrained('balance_subitems')->onDelete('set null');
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('ARS');
            $table->timestamps();

            $table->index(['balance_id', 'balance_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('balance_breakdowns');
    }
};
