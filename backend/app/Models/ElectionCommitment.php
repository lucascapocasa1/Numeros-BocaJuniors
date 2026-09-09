<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ElectionCommitment extends Model
{
    protected $table = 'election_commitments';

    protected $fillable = [
        'election_proposal_id',
        'kind',
        'description',
        'metric_value',
        'metric_unit',
        'deadline',
        'order',
    ];

    protected $casts = [
        'metric_value' => 'decimal:2',
    ];

    public function proposal()
    {
        return $this->belongsTo(ElectionProposal::class, 'election_proposal_id');
    }
}
