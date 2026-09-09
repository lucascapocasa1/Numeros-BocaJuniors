<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ElectionProposal extends Model
{
    protected $table = 'election_proposals';

    protected $fillable = [
        'election_list_id',
        'title',
        'description',
        'no_commitments_reason',
        'order',
    ];

    public function electionList()
    {
        return $this->belongsTo(ElectionList::class);
    }

    public function commitments()
    {
        return $this->hasMany(ElectionCommitment::class)->orderBy('order')->orderBy('id');
    }
}
