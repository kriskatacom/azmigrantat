<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TotpAuthPending extends Model
{
    protected $table = 'totp_auth_pending';

    protected $fillable = [
        'user_id',
        'oauth_app_id',
        'remember_me',
        'token_hash',
        'expires_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'oauth_app_id' => 'integer',
        'remember_me' => 'boolean',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
