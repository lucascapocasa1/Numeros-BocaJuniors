<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StadiumMatch extends Model
{
    protected $table = 'stadium_matches';

    protected $fillable = ['opponent', 'match_date', 'match_time', 'competition', 'is_home'];

    protected $casts = [
        'is_home'    => 'boolean',
        'match_date' => 'date:Y-m-d',
    ];

    public function ticketPrices(): HasMany
    {
        return $this->hasMany(TicketPrice::class);
    }

    public function ticketPricesWithSectors(): HasMany
    {
        return $this->hasMany(TicketPrice::class)->with('sector');
    }
}
