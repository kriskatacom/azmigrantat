<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserDevice extends Model
{
    use SoftDeletes;

    public const PLATFORM_ANDROID = 'android';
    public const PLATFORM_IOS = 'ios';

    protected $table = 'user_devices';

    protected $fillable = [
        'user_id',
        'device_uuid',
        'push_token',
        'platform',
        'device_name',
        'app_version',
        'is_active',
        'last_seen_at',
    ];

    protected $hidden = [
        'push_token',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'is_active' => 'boolean',
        'last_seen_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeAndroid($query)
    {
        return $query->where(
            'platform',
            self::PLATFORM_ANDROID
        );
    }

    public function scopeIos($query)
    {
        return $query->where(
            'platform',
            self::PLATFORM_IOS
        );
    }
}