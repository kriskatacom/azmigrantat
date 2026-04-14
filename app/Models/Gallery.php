<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Gallery extends Model
{
    use SoftDeletes;

    protected $table = 'galleries';

    protected $fillable = [
        'user_id',
        'slug',
        'payload',
        'description',
        'user_agent',
        'is_active',
        'last_activity'
    ];

    public function media()
    {
        return $this->belongsToMany(
            Media::class,
            'gallery_media',
            'gallery_id',
            'media_id'
        )
            ->withPivot('sort_order')
            ->orderByPivot('sort_order', 'asc');
    }

    protected $dates = ['deleted_at'];

    protected $casts = [
        'deleted_at' => 'datetime',
        'last_activity' => 'integer',
        'is_active' => 'boolean'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
