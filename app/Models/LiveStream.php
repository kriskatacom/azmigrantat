<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LiveStream extends Model
{
    public const STATUS_IDLE = 'idle';
    public const STATUS_LIVE = 'live';
    public const STATUS_ENDED = 'ended';

    public const MEDIA_PROVIDER_MOCK = 'mock';
    public const MEDIA_PROVIDER_LIVEKIT = 'livekit';

    protected $table = 'live_streams';

    protected $fillable = [
        'user_id',
        'title',
        'status',
        'media_provider',
        'media_room_id',
        'viewer_count',
        'peak_viewer_count',
        'started_at',
        'ended_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'viewer_count' => 'integer',
        'peak_viewer_count' => 'integer',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function viewers()
    {
        return $this->hasMany(LiveViewer::class, 'live_stream_id');
    }

    public function comments()
    {
        return $this->hasMany(LiveComment::class, 'live_stream_id');
    }

    public function isIdle(): bool
    {
        return $this->status === self::STATUS_IDLE;
    }

    public function isLive(): bool
    {
        return $this->status === self::STATUS_LIVE;
    }

    public function isEnded(): bool
    {
        return $this->status === self::STATUS_ENDED;
    }

    public function isOwnedBy(int $userId): bool
    {
        return (int) $this->user_id === $userId;
    }
}
