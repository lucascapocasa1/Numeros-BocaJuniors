<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EconomyRecord extends Model
{
    use HasFactory;

    protected $table = 'economy_records';

    protected $fillable = [
        'description',
        'comments',
        'entity',
        'type',
        'amount',
        'currency',
        'record_date',
        'carried_out_date',
        'links',
    ];

    protected $casts = [
        'amount'           => 'decimal:2',
        'carried_out_date' => 'date',
        'links'            => 'array',
        'record_date'      => 'date',
    ];

    public function scopeOfficial($query, ?bool $official): mixed
    {
        if ($official === null) {
            return $query;
        }
        if ($official) {
            return $query->whereJsonContains('links', ['official' => true]);
        }
        return $query->whereRaw("(links IS NULL OR NOT JSON_CONTAINS(COALESCE(links, '[]'), '{\"official\":true}'))");
    }

    public function scopeType($query, ?string $type): mixed
    {
        if ($type === null) {
            return $query;
        }
        return $query->where('type', $type);
    }

    public function scopeDateFrom($query, ?string $from): mixed
    {
        if ($from === null) {
            return $query;
        }
        return $query->where('record_date', '>=', $from);
    }

    public function scopeDateTo($query, ?string $to): mixed
    {
        if ($to === null) {
            return $query;
        }
        return $query->where(function ($q) use ($to) {
            $q->whereNull('record_date')
              ->orWhere('record_date', '<=', $to);
        });
    }

    public function scopeCarriedOut($query, ?bool $carriedOut): mixed
    {
        if ($carriedOut === null) {
            return $query;
        }
        if ($carriedOut) {
            return $query->whereNotNull('carried_out_date');
        }
        return $query->whereNull('carried_out_date');
    }

    public function scopeOverdue($query, ?bool $overdue): mixed
    {
        if (!$overdue) {
            return $query;
        }
        return $query->where(function ($q) {
            $q->whereNull('record_date')
              ->orWhere('record_date', '<', Carbon::today()->toDateString());
        });
    }

    public function scopeSearch($query, ?string $search): mixed
    {
        if ($search === null || $search === '') {
            return $query;
        }
        return $query->where(function ($q) use ($search) {
            $q->where('description', 'like', '%' . $search . '%')
              ->orWhere('entity', 'like', '%' . $search . '%');
        });
    }

    public function scopeCurrency($query, ?string $currency): mixed
    {
        if ($currency === null) {
            return $query;
        }
        return $query->where('currency', $currency);
    }
}
