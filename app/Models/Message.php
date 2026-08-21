<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use SoftDeletes;

    public const TYPE_TEXT = 'text';
    public const TYPE_IMAGE = 'image';
    public const TYPE_VIDEO = 'video';
    public const TYPE_AUDIO = 'audio';
    public const TYPE_FILE = 'file';
    public const TYPE_SYSTEM = 'system';

    public const STATUS_SENT = 'sent';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_READ = 'read';

    protected $table = 'messages';

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'client_message_id',
        'type',
        'content',
        'metadata',
        'status',
        'delivered_at',
        'read_at',
        'edited_at',
    ];

    protected $casts = [
        'conversation_id' => 'integer',
        'sender_id' => 'integer',
        'metadata' => 'array',
        'delivered_at' => 'datetime',
        'read_at' => 'datetime',
        'edited_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class, 'conversation_id');
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function reactions()
    {
        return $this->hasMany(MessageReaction::class, 'message_id');
    }

    public function readByParticipants()
    {
        return $this->hasMany(
            Participant::class,
            'last_read_message_id'
        );
    }

    public function markAsDelivered(): bool
    {
        return $this->update([
            'status' => self::STATUS_DELIVERED,
            'delivered_at' => Carbon::now(),
        ]);
    }

    public function markAsRead(): bool
    {
        return $this->update([
            'status' => self::STATUS_READ,
            'read_at' => Carbon::now(),
            'delivered_at' => $this->delivered_at ?? Carbon::now(),
        ]);
    }

    public function isSent(): bool
    {
        return $this->status === self::STATUS_SENT;
    }

    public function isDelivered(): bool
    {
        return $this->status === self::STATUS_DELIVERED;
    }

    public function isRead(): bool
    {
        return $this->status === self::STATUS_READ;
    }
}