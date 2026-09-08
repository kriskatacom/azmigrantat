<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeviceAuthPending extends Model
{
    protected $table = 'device_auth_pending';

    protected $fillable = [
        'user_id',
        'oauth_app_id',
        'remember_me',
        'token_hash',
        'new_device_uuid',
        'platform',
        'device_name',
        'email_code_hash',
        'email_code_expires_at',
        'approved_at',
        'expires_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'oauth_app_id' => 'integer',
        'remember_me' => 'boolean',
        'email_code_expires_at' => 'datetime',
        'approved_at' => 'datetime',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function oauthApp()
    {
        return $this->belongsTo(OauthApp::class, 'oauth_app_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at === null
            || $this->expires_at->getTimestamp() <= time();
    }

    public function isApproved(): bool
    {
        return $this->approved_at !== null;
    }
}
