<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PushToken extends Model
{
    protected $table = 'push_tokens';

    protected $fillable = [
        'user_id',
        'token',
        'platform',
        'provider',
        'device_id',
        'is_active',
        'deactivated_reason',
        'last_seen_at',
        'last_used_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'is_active' => 'boolean',
        'last_seen_at' => 'datetime',
        'last_used_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(
            User::class,
            'user_id'
        );
    }
}
