<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LiveViewer extends Model
{
    protected $table = 'live_viewers';

    protected $fillable = [
        'live_stream_id',
        'user_id',
        'joined_at',
        'left_at',
    ];

    protected $casts = [
        'live_stream_id' => 'integer',
        'user_id' => 'integer',
        'joined_at' => 'datetime',
        'left_at' => 'datetime',
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

    public function isPresent(): bool
    {
        return $this->left_at === null;
    }
}
