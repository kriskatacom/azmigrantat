<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Participant extends Model
{
    public const ROLE_MEMBER = 'member';
    public const ROLE_ADMIN = 'admin';
    public const ROLE_OWNER = 'owner';

    protected $table = 'participants';

    protected $fillable = [
        'conversation_id',
        'user_id',
        'role',
        'last_read_message_id',
        'last_read_at',
        'is_muted',
        'is_archived',
        'joined_at',
        'left_at',
    ];

    protected $casts = [
        'conversation_id' => 'integer',
        'user_id' => 'integer',
        'last_read_message_id' => 'integer',
        'is_muted' => 'boolean',
        'is_archived' => 'boolean',
        'last_read_at' => 'datetime',
        'joined_at' => 'datetime',
        'left_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function conversation()
    {
        return $this->belongsTo(
            Conversation::class,
            'conversation_id'
        );
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function lastReadMessage()
    {
        return $this->belongsTo(
            Message::class,
            'last_read_message_id'
        );
    }

    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER;
    }

    public function isAdmin(): bool
    {
        return in_array(
            $this->role,
            [self::ROLE_OWNER, self::ROLE_ADMIN],
            true
        );
    }
}