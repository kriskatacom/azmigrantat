<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    public const TYPE_MISSED_VIDEO_CALL = 'missed_video_call';
    public const TYPE_MESSAGE_REACTION = 'message_reaction';
    public const TYPE_TEXT = 'text';

    protected $table = 'notifications';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'count',
        'is_read',
        'actor_id',
        'entity_id',
        'data',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'count' => 'integer',
        'is_read' => 'boolean',
        'actor_id' => 'integer',
        'data' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function events()
    {
        return $this->hasMany(NotificationEvent::class, 'notification_id');
    }
}
