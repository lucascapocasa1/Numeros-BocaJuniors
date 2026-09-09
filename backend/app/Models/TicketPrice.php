<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketPrice extends Model
{
    protected $table = 'ticket_prices';

    protected $fillable = ['stadium_match_id', 'stadium_sector_id', 'price', 'currency'];

    protected $casts = [
        'price' => 'float',
    ];

    public function match(): BelongsTo
    {
        return $this->belongsTo(StadiumMatch::class, 'stadium_match_id');
    }

    public function sector(): BelongsTo
    {
        return $this->belongsTo(StadiumSector::class, 'stadium_sector_id');
    }
}
