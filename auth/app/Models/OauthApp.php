<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class OauthApp extends Model
{
    use SoftDeletes;

    protected $table = 'oauth_apps';

    protected $fillable = [
        'name',
        'client_id',
        'client_secret',
        'redirect_uri',
        'is_active',
        'options',
    ];

    protected $casts = [
        'options' => 'array',
        'is_active'  => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    public function isActive(): bool
    {
        return $this->is_active === true;
    }
}