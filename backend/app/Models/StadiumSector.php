<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StadiumSector extends Model
{
    protected $table = 'stadium_sectors';

    protected $fillable = ['stadium_config_id', 'name', 'capacity', 'order'];

    protected $casts = [
        'capacity' => 'integer',
        'order'    => 'integer',
    ];

    public function stadium(): BelongsTo
    {
        return $this->belongsTo(StadiumConfig::class, 'stadium_config_id');
    }

    public function ticketPrices(): HasMany
    {
        return $this->hasMany(TicketPrice::class);
    }
}
