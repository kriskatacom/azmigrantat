<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class MessageReaction extends Model
{
    public const TYPES = [
        'like' => '👍',
        'dislike' => '👎',
        'heart' => '❤️',
        'wow' => '😮',
        'laugh' => '😂',
        'clap' => '👏',
        'fire' => '🔥',
        'sad' => '😢',
        'pray' => '🙏',
        'party' => '🎉',
    ];

    protected $table = 'message_reactions';

    protected $fillable = [
        'message_id',
        'user_id',
        'type',
    ];

    protected $casts = [
        'message_id' => 'integer',
        'user_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static function isValidType(string $type): bool
    {
        return array_key_exists($type, self::TYPES);
    }

    public static function emoji(string $type): string
    {
        return self::TYPES[$type] ?? '';
    }

    /**
     * @return array{mine: ?string, items: array<int, array{type: string, count: int, reacted: bool}>}
     */
    public static function summarize(Collection $reactions, ?int $currentUserId = null): array
    {
        $grouped = [];
        $mine = null;

        foreach ($reactions as $reaction) {
            $type = (string) $reaction->type;

            if (!self::isValidType($type)) {
                continue;
            }

            if (!isset($grouped[$type])) {
                $grouped[$type] = [
                    'type' => $type,
                    'count' => 0,
                    'reacted' => false,
                ];
            }

            $grouped[$type]['count'] += 1;

            if (
                $currentUserId !== null &&
                (int) $reaction->user_id === $currentUserId
            ) {
                $grouped[$type]['reacted'] = true;
                $mine = $type;
            }
        }

        return [
            'mine' => $mine,
            'items' => array_values($grouped),
        ];
    }

    public function message()
    {
        return $this->belongsTo(Message::class, 'message_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
