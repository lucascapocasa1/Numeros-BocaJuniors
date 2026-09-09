<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Balance extends Model
{
    protected $fillable = [
        'exercise',
        'file_path',
        'file_original_name',
        'dollar_reference',
        'published_at',
    ];

    protected $casts = [
        'dollar_reference' => 'decimal:2',
        'published_at'     => 'date',
    ];

    public function lines()
    {
        return $this->hasMany(BalanceLine::class)->orderBy('order');
    }

    public function rootLines()
    {
        return $this->hasMany(BalanceLine::class)->whereNull('parent_id')->orderBy('order');
    }
}
