<?php

namespace App\Repositories;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

final class MessageRepository
{
    public function getForConversation(
        Conversation $conversation,
        int $limit = 30,
        ?int $beforeId = null
    ): array {
        $limit = min(max($limit, 1), 100);

        $query = Message::query()
            ->where('conversation_id', $conversation->id)
            ->with('sender')
            ->orderByDesc('id');

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

    public function createTextMessage(
        Conversation $conversation,
        User $sender,
        string $clientMessageId,
        string $content
    ): Message {
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $sender->id,
            'client_message_id' => $clientMessageId,
            'type' => Message::TYPE_TEXT,
            'content' => trim($content),
            'status' => Message::STATUS_SENT,
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
        return Message::query()
            ->where('conversation_id', $conversationId)
            ->where('sender_id', '!=', $readerId)
            ->where('id', '<=', $messageId)
            ->where('status', '!=', Message::STATUS_READ)
            ->update([
                'status' => Message::STATUS_READ,
                'read_at' => $readAt,
                'delivered_at' => $readAt,
            ]);
    }
}