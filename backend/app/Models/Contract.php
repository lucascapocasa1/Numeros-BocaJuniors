<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Contract extends Model
{
    use HasFactory;

    protected $table = 'contracts';

    protected $fillable = [
        'parent_id',
        'external_id',
        'full_name',
        'expiration_date',
        'signing_date',
        'termination_date',
        'club_pass_percentage',
        'estimated_salary',
        'currency',
        'clauses',
        'links',
        'loan',
        'loan_date',
        'loan_return_date',
    ];

    protected $casts = [
        'club_pass_percentage' => 'decimal:2',
        'estimated_salary'     => 'decimal:2',
        'clauses'             => 'array',
        'links'               => 'array',
        'loan'                => 'array',
        'expiration_date'     => 'date',
        'signing_date'        => 'date',
        'termination_date'    => 'date',
        'loan_date'           => 'date',
        'loan_return_date'    => 'date',
    ];

    public function parent(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Contract::class, 'parent_id');
    }

    public function children(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Contract::class, 'parent_id')->orderBy('created_at', 'asc');
    }

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

    public function scopeDateFrom($query, ?string $from): mixed
    {
        if ($from === null) {
            return $query;
        }
        return $query->where('signing_date', '>=', $from);
    }

    public function scopeDateTo($query, ?string $to): mixed
    {
        if ($to === null) {
            return $query;
        }
        return $query->where('signing_date', '<=', $to);
    }

    public function scopeExternalId($query, ?string $externalId): mixed
    {
        if ($externalId === null || $externalId === '') {
            return $query;
        }
        return $query->where('external_id', $externalId);
    }

    public function scopeSearch($query, ?string $search): mixed
    {
        if ($search === null || $search === '') {
            return $query;
        }
        return $query->where('full_name', 'like', '%' . $search . '%');
    }

    public function scopeStatus($query, ?string $status): mixed
    {
        if ($status === null) {
            return $query;
        }
        $today = Carbon::now()->startOfDay();
        return match ($status) {
            'vigente' => $query->where(function ($q) use ($today) {
                $q->whereNull('termination_date')
                  ->orWhere('termination_date', '>=', $today);
            })->where('expiration_date', '>=', $today),
            'vencido' => $query->where(function ($q) use ($today) {
                $q->where('expiration_date', '<', $today)
                  ->orWhere(function ($q2) use ($today) {
                      $q2->whereNotNull('termination_date')
                         ->where('termination_date', '<', $today);
                  });
            }),
            default   => $query,
        };
    }

    public function scopeExpireFrom($query, ?string $from): mixed
    {
        if ($from === null) {
            return $query;
        }
        return $query->where('expiration_date', '>=', $from);
    }

    public function scopeExpireTo($query, ?string $to): mixed
    {
        if ($to === null) {
            return $query;
        }
        return $query->where('expiration_date', '<=', $to);
    }

    public function scopeLoan($query, ?string $loan): mixed
    {
        if ($loan === null) {
            return $query;
        }
        return match ($loan) {
            '1'     => $query->whereNotNull('loan'),
            '0'     => $query->whereNull('loan'),
            default => $query,
        };
    }

    public function scopeCurrency($query, ?string $currency): mixed
    {
        if ($currency === null) {
            return $query;
        }
        return $query->where('currency', $currency);
    }

    public function scopeValidity($query, ?string $validity): mixed
    {
        if ($validity === null || $validity === '') {
            return $query;
        }

        $today = Carbon::now()->startOfDay();

        // Use effective end date: termination_date if set, otherwise expiration_date
        return match ($validity) {
            '6m'  => $query->whereRaw('COALESCE(termination_date, expiration_date) >= ?', [$today])
                           ->whereRaw('COALESCE(termination_date, expiration_date) <= ?', [$today->copy()->addMonths(6)]),
            '12m' => $query->whereRaw('COALESCE(termination_date, expiration_date) >= ?', [$today])
                           ->whereRaw('COALESCE(termination_date, expiration_date) <= ?', [$today->copy()->addMonths(12)]),
            '18m' => $query->whereRaw('COALESCE(termination_date, expiration_date) >= ?', [$today])
                           ->whereRaw('COALESCE(termination_date, expiration_date) <= ?', [$today->copy()->addMonths(18)]),
            default => $query,
        };
    }
}
