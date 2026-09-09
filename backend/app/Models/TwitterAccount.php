<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TwitterAccount extends Model
{
    protected $table = 'twitter_accounts';

    protected $fillable = [
        'username',
        'twitter_user_id',
        'is_official',
        'last_checked_at',
    ];

    protected $casts = [
        'is_official'     => 'boolean',
        'last_checked_at' => 'datetime',
    ];
}
