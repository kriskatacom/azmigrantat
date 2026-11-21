<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class VideoSave extends Model
{
    protected $table = 'video_saves';

    protected $fillable = ['video_id', 'user_id'];

    protected $casts = [
        'video_id' => 'integer',
        'user_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function video() { return $this->belongsTo(Video::class, 'video_id'); }
    public function user() { return $this->belongsTo(User::class, 'user_id'); }
}
