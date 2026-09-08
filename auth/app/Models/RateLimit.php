<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RateLimit extends Model
{
    protected $table = 'rate_limits';

    public $timestamps = false;

    protected $fillable = [
        'bucket',
        'attempts',
        'window_starts_at',
        'updated_at',
    ];

    protected $casts = [
        'attempts' => 'integer',
        'window_starts_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
