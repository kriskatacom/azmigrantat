<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\User;

final class CallAuthorizationService
{
    public function authorize(int $callerId, int $recipientId): array
    {
        if ($callerId === $recipientId) {
            return ['authorized' => false];
        }

        $activeUsers = User::query()
            ->whereIn('id', [$callerId, $recipientId])
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->count();

        if ($activeUsers !== 2) {
            return ['authorized' => false];
        }

        $conversation = Conversation::query()
            ->where('type', 'direct')
            ->where('direct_key', Conversation::makeDirectKey($callerId, $recipientId))
            ->where('is_active', true)
            ->whereHas('participants', static function ($query) use ($callerId): void {
                $query->where('user_id', $callerId)->whereNull('left_at');
            })
            ->whereHas('participants', static function ($query) use ($recipientId): void {
                $query->where('user_id', $recipientId)->whereNull('left_at');
            })
            ->first(['id']);

        return $conversation
            ? ['authorized' => true, 'conversation_id' => (int) $conversation->id]
            : ['authorized' => false];
    }
}
