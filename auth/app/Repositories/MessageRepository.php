<?php

namespace App\Repositories;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Participant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

final class MessageRepository
{
    public function applyVisibility(
        $query,
        int $userId,
        ?Participant $participant
    ) {
        $clearedBeforeId = (int) ($participant?->cleared_before_id ?? 0);
        $clearedOwnBeforeId = (int) ($participant?->cleared_own_before_id ?? 0);

        if ($clearedBeforeId > 0) {
            $query->where('id', '>', $clearedBeforeId);
        }

        if ($clearedOwnBeforeId > 0) {
            $query->where(function ($visible) use ($userId, $clearedOwnBeforeId) {
                $visible
                    ->where('sender_id', '!=', $userId)
                    ->orWhere('id', '>', $clearedOwnBeforeId);
            });
        }

        return $query;
    }

    public function getForConversation(
        Conversation $conversation,
        int $limit = 30,
        ?int $beforeId = null,
        ?int $viewerId = null,
        ?Participant $participant = null
    ): array {
        $limit = min(max($limit, 1), 100);

        $query = Message::query()
            ->where('conversation_id', $conversation->id)
            ->with(['sender', 'reactions'])
            ->orderByDesc('id');

        if ($viewerId !== null) {
            $this->applyVisibility($query, $viewerId, $participant);
        }

        if ($beforeId !== null) {
            $query->where('id', '<', $beforeId);
        }

        $messages = $query
            ->limit($limit + 1)
            ->get();

        $hasMore = $messages->count() > $limit;

        if ($hasMore) {
            $messages = $messages->take($limit);
        }

        $messages = $messages
            ->reverse()
            ->values();

        return [
            'messages' => $messages,
            'has_more' => $hasMore,
            'next_before_id' => $messages->isNotEmpty()
                ? (int) $messages->first()->id
                : null,
        ];
    }

    public function findByClientMessageId(
        int $senderId,
        string $clientMessageId
    ): ?Message {
        return Message::query()
            ->where('sender_id', $senderId)
            ->where('client_message_id', $clientMessageId)
            ->with('sender')
            ->first();
    }

    public function createMessage(
        Conversation $conversation,
        User $sender,
        string $clientMessageId,
        ?string $content,
        string $type = 'text',
        ?array $metadata = null
    ): Message {
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $sender->id,
            'client_message_id' => $clientMessageId,
            'type' => $type,
            'content' => $content,
            'metadata' => $metadata,
            'status' => 'sent',
        ]);

        return $message->load('sender');
    }

    public function findInConversation(
        int $conversationId,
        ?int $messageId = null
    ): ?Message {
        $query = Message::query()
            ->where('conversation_id', $conversationId);

        if ($messageId !== null) {
            $query->where('id', $messageId);
        } else {
            $query->orderByDesc('id');
        }

        return $query->first();
    }

    public function markAsReadUntil(
        int $conversationId,
        int $readerId,
        int $messageId,
        Carbon $readAt
    ): int {
        $updated = Message::query()
            ->where('conversation_id', $conversationId)
            ->where('sender_id', '!=', $readerId)
            ->where('id', '<=', $messageId)
            ->where('status', '!=', Message::STATUS_READ)
            ->update([
                'status' => Message::STATUS_READ,
                'read_at' => $readAt,
            ]);

        Message::query()
            ->where('conversation_id', $conversationId)
            ->where('sender_id', '!=', $readerId)
            ->where('id', '<=', $messageId)
            ->whereNull('delivered_at')
            ->update([
                'delivered_at' => $readAt,
            ]);

        return $updated;
    }

    public function markAsDeliveredUntil(
        int $conversationId,
        int $recipientId,
        int $messageId,
        Carbon $deliveredAt
    ): int {
        return Message::query()
            ->where('conversation_id', $conversationId)
            ->where('sender_id', '!=', $recipientId)
            ->where('id', '<=', $messageId)
            ->where('status', Message::STATUS_SENT)
            ->update([
                'status' => Message::STATUS_DELIVERED,
                'delivered_at' => $deliveredAt,
            ]);
    }

    public function countUnreadForUser(
        User $user,
        array $conversationIds
    ): int {
        if ($conversationIds === []) {
            return 0;
        }

        return Message::query()
            ->join('participants as unread_participants', function ($join) use ($user) {
                $join
                    ->on(
                        'unread_participants.conversation_id',
                        '=',
                        'messages.conversation_id'
                    )
                    ->where('unread_participants.user_id', (int) $user->id);
            })
            ->whereIn(
                'messages.conversation_id',
                $conversationIds
            )
            ->where(
                'messages.sender_id',
                '!=',
                (int) $user->id
            )
            ->where('messages.type', '!=', Message::TYPE_SYSTEM)
            ->where(
                'messages.status',
                '!=',
                Message::STATUS_READ
            )
            ->where(function ($visible) {
                $visible
                    ->whereNull('unread_participants.cleared_before_id')
                    ->orWhereColumn(
                        'messages.id',
                        '>',
                        'unread_participants.cleared_before_id'
                    );
            })
            ->count();
    }

    public function findLatestVisible(
        int $conversationId,
        int $userId,
        ?Participant $participant
    ): ?Message {
        $query = Message::query()
            ->where('conversation_id', $conversationId)
            ->with(['sender', 'reactions'])
            ->orderByDesc('id');

        $this->applyVisibility($query, $userId, $participant);

        return $query->first();
    }
}
