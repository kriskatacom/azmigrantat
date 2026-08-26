<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LiveComment extends Model
{
    public const MAX_BODY_LENGTH = 280;

    protected $table = 'live_comments';

    protected $fillable = [
        'live_stream_id',
        'user_id',
        'body',
    ];

    protected $casts = [
        'live_stream_id' => 'integer',
        'user_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function stream()
    {
        return $this->belongsTo(LiveStream::class, 'live_stream_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
