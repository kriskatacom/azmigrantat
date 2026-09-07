<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\User;
use App\Models\UserBlock;
use RuntimeException;

final class BlockService
{
    public function areBlocked(int $firstUserId, int $secondUserId): bool
    {
        if ($firstUserId <= 0 || $secondUserId <= 0 || $firstUserId === $secondUserId) {
            return false;
        }

        return UserBlock::query()
            ->where(function ($query) use ($firstUserId, $secondUserId) {
                $query
                    ->where(function ($inner) use ($firstUserId, $secondUserId) {
                        $inner
                            ->where('blocker_id', $firstUserId)
                            ->where('blocked_id', $secondUserId);
                    })
                    ->orWhere(function ($inner) use ($firstUserId, $secondUserId) {
                        $inner
                            ->where('blocker_id', $secondUserId)
                            ->where('blocked_id', $firstUserId);
                    });
            })
            ->exists();
    }

    public function isBlockedBy(int $blockerId, int $blockedId): bool
    {
        if ($blockerId <= 0 || $blockedId <= 0 || $blockerId === $blockedId) {
            return false;
        }

        return UserBlock::query()
            ->where('blocker_id', $blockerId)
            ->where('blocked_id', $blockedId)
            ->exists();
    }

    public function isBlockedByOtherInConversation(Conversation $conversation, int $currentUserId): bool
    {
        $otherUserId = $this->otherUserIdFor($conversation, $currentUserId);

        return $otherUserId !== null
            && $this->isBlockedBy($otherUserId, $currentUserId);
    }

    /**
     * @return int[]
     */
    public function relatedUserIds(int $userId): array
    {
        $blockedIds = UserBlock::query()
            ->where('blocker_id', $userId)
            ->pluck('blocked_id');

        $blockedByIds = UserBlock::query()
            ->where('blocked_id', $userId)
            ->pluck('blocker_id');

        return $blockedIds
            ->merge($blockedByIds)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    public function otherUserIdFor(Conversation $conversation, int $currentUserId): ?int
    {
        $participants = $conversation->relationLoaded('participants')
            ? $conversation->participants
            : $conversation->participants()->get();

        $other = $participants->first(
            fn ($participant) => (int) $participant->user_id !== $currentUserId
        );

        return $other ? (int) $other->user_id : null;
    }

    public function isBlockedInConversation(Conversation $conversation, int $currentUserId): bool
    {
        $otherUserId = $this->otherUserIdFor($conversation, $currentUserId);

        return $otherUserId !== null
            && $this->areBlocked($currentUserId, $otherUserId);
    }

    public function blockByCode(User $blocker, string $code): UserBlock
    {
        $target = User::findByPublicCode($code);

        if (!$target || !$target->is_active) {
            throw new RuntimeException('Не е намерен потребител с този код.');
        }

        if ((int) $target->id === (int) $blocker->id) {
            throw new RuntimeException('Не можете да блокирате себе си.');
        }

        $existing = UserBlock::query()
            ->where('blocker_id', $blocker->id)
            ->where('blocked_id', $target->id)
            ->first();

        if ($existing) {
            return $existing;
        }

        return UserBlock::create([
            'blocker_id' => $blocker->id,
            'blocked_id' => $target->id,
        ]);
    }

    public function unblock(User $blocker, int $blockId): ?int
    {
        $block = UserBlock::query()
            ->where('id', $blockId)
            ->where('blocker_id', $blocker->id)
            ->first();

        if (!$block) {
            return null;
        }

        $blockedId = (int) $block->blocked_id;
        $block->delete();

        return $blockedId;
    }
}
