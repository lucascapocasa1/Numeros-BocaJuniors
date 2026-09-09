<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ElectionList extends Model
{
    protected $table = 'election_lists';

    protected $fillable = [
        'token',
        'slug',
        'name',
        'source_url',
        'logo_path',
        'logo_original_name',
    ];

    public function candidates()
    {
        return $this->hasMany(ElectionCandidate::class)->orderBy('order')->orderBy('id');
    }

    public function proposals()
    {
        return $this->hasMany(ElectionProposal::class)->orderBy('order')->orderBy('id');
    }
}
