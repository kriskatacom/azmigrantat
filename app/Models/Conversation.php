<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Conversation extends Model
{
    use SoftDeletes;

    protected $table = 'conversations';

    protected $fillable = [
        'type',
        'direct_key',
        'title',
        'image',
        'created_by',
        'last_message_id',
        'is_active',
    ];

    protected $casts = [
        'created_by' => 'integer',
        'last_message_id' => 'integer',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function messages()
    {
        return $this->hasMany(Message::class, 'conversation_id')
            ->orderBy('id');
    }

    public function participants()
    {
        return $this->hasMany(Participant::class, 'conversation_id');
    }

    public function users()
    {
        return $this->belongsToMany(
            User::class,
            'participants',
            'conversation_id',
            'user_id'
        )->withPivot([
            'role',
            'last_read_message_id',
            'last_read_at',
            'is_muted',
            'is_archived',
            'joined_at',
            'left_at',
        ]);
    }

    public function lastMessage()
    {
        return $this->belongsTo(Message::class, 'last_message_id');
    }

    public function isDirect(): bool
    {
        return $this->type === 'direct';
    }

    public function isGroup(): bool
    {
        return $this->type === 'group';
    }

    public static function makeDirectKey(int $firstUserId, int $secondUserId): string
    {
        return min($firstUserId, $secondUserId)
            . ':'
            . max($firstUserId, $secondUserId);
    }
}
