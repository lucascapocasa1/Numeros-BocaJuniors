<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BalanceLine extends Model
{
    protected $fillable = [
        'balance_id',
        'parent_id',
        'name',
        'normalized_name',
        'level',
        'order',
        'amount',
        'currency',
        'is_total',
        'path',
    ];

    protected $casts = [
        'amount'   => 'decimal:2',
        'is_total' => 'boolean',
        'level'    => 'integer',
        'order'    => 'integer',
    ];

    public function balance()
    {
        return $this->belongsTo(Balance::class);
    }

    public function parent()
    {
        return $this->belongsTo(BalanceLine::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(BalanceLine::class, 'parent_id')->orderBy('order');
    }

    /**
     * Normalize a name to a consistent key for cross-balance comparison.
     * Lowercases, strips accents, replaces whitespace/separators with underscores.
     */
    public static function normalizeName(string $name): string
    {
        $lower = strtolower(trim($name));
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $lower) ?: $lower;
        return preg_replace('/[\s\-\/]+/', '_', trim($ascii));
    }
}
