<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTicketPricesTable extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stadium_match_id')->constrained('stadium_matches')->onDelete('cascade');
            $table->foreignId('stadium_sector_id')->constrained('stadium_sectors')->onDelete('cascade');
            $table->decimal('price', 12, 2);
            $table->string('currency', 3)->default('ARS');
            $table->timestamps();

            $table->unique(['stadium_match_id', 'stadium_sector_id']);
            $table->index('stadium_match_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_prices');
    }
}
