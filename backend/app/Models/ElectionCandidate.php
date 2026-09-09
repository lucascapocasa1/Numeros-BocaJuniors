<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ElectionCandidate extends Model
{
    protected $table = 'election_candidates';

    protected $fillable = [
        'election_list_id',
        'first_name',
        'last_name',
        'position',
        'photo_path',
        'photo_original_name',
        'cv_path',
        'cv_original_name',
        'order',
    ];

    public function electionList()
    {
        return $this->belongsTo(ElectionList::class);
    }
}
