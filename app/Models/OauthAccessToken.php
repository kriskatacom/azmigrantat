<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OauthAccessToken extends Model
{
    protected $table = 'oauth_access_tokens';

    protected $fillable = [
        'token',
        'user_id',
        'app_id',
        'expires_at'
    ];

    protected $casts = [
        'user_id' => 'integer',
        'app_id' => 'integer',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function application()
    {
        return $this->belongsTo(OauthApp::class, 'app_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}