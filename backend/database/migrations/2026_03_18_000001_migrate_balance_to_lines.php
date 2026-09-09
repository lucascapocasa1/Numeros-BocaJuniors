<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create balance_lines (hierarchical self-referencing tree)
        Schema::create('balance_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('balance_id')->constrained('balances')->cascadeOnDelete();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('name');
            $table->string('normalized_name')->nullable();
            $table->integer('level');
            $table->integer('order');
            $table->decimal('amount', 15, 2)->nullable();
            $table->string('currency', 3)->default('ARS');
            $table->boolean('is_total')->default(false);
            $table->text('path')->nullable();
            $table->timestamps();

            $table->index('balance_id');
            $table->index('parent_id');
            $table->index(['balance_id', 'name']);

            $table->foreign('parent_id')
                ->references('id')
                ->on('balance_lines')
                ->cascadeOnDelete();
        });

        // 3. Drop old tables (dependency order: breakdowns → subitems → items)
        Schema::dropIfExists('balance_breakdowns');
        Schema::dropIfExists('balance_subitems');
        Schema::dropIfExists('balance_items');
    }

    public function down(): void
    {
        Schema::create('balance_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        Schema::create('balance_subitems', function (Blueprint $table) {
            $table->id();
            $table->foreignId('balance_item_id')->constrained('balance_items')->cascadeOnDelete();
            $table->string('name');
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        Schema::create('balance_breakdowns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('balance_id')->constrained('balances')->cascadeOnDelete();
            $table->foreignId('balance_item_id')->constrained('balance_items')->cascadeOnDelete();
            $table->unsignedBigInteger('balance_subitem_id')->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('ARS');
            $table->timestamps();
            $table->index(['balance_id', 'balance_item_id']);
        });

        Schema::dropIfExists('balance_lines');
    }
};
