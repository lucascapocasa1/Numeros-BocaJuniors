<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StadiumConfig extends Model
{
    protected $table = 'stadium_config';

    protected $fillable = ['name', 'link', 'link_official'];

    protected $casts = ['link_official' => 'boolean'];

    public function sectors(): HasMany
    {
        return $this->hasMany(StadiumSector::class)->orderBy('order')->orderBy('id');
    }
}
