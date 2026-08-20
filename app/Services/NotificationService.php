<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\NotificationEvent;
use App\Models\User;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\QueryException;
use Throwable;

final class NotificationService
{
    public function recordMissedVideoCall(
        int $recipientId,
        int $callerId,
        string $callId,
        ?string $callerName = null,
        ?string $callerAvatar = null,
        ?int $conversationId = null
    ): array {
        $eventKey = 'missed_video_call:' . $callId;

        try {
            return Capsule::connection()->transaction(function () use (
                $recipientId,
                $callerId,
                $callId,
                $callerName,
                $callerAvatar,
                $conversationId,
                $eventKey
            ) {
                $existingEvent = NotificationEvent::query()
                    ->where('event_key', $eventKey)
                    ->lockForUpdate()
                    ->first();

                if ($existingEvent) {
                    $notification = Notification::query()
                        ->with('actor')
                        ->find($existingEvent->notification_id);

                    return [
                        'duplicate' => true,
                        'created' => false,
                        'updated' => false,
                        'notification' => $notification,
                    ];
                }

                $actor = User::query()->find($callerId);
                $title = $callerName ?: ($actor?->name ?: 'Видео обаждане');
                $data = array_filter([
                    'call_id' => $callId,
                    'caller_id' => $callerId,
                    'caller_name' => $title,
                    'caller_avatar' => $callerAvatar ?: $actor?->profile_image_url,
                    'conversation_id' => $conversationId,
                ], static fn ($value) => $value !== null && $value !== '');

                $group = Notification::query()
                    ->where('user_id', $recipientId)
                    ->where('type', Notification::TYPE_MISSED_VIDEO_CALL)
                    ->where('actor_id', $callerId)
                    ->where('is_read', false)
                    ->orderByDesc('id')
                    ->lockForUpdate()
                    ->first();

                if ($group) {
                    $count = (int) $group->count + 1;
                    $group->fill([
                        'title' => $title,
                        'message' => $this->missedVideoCallMessage($count),
                        'count' => $count,
                        'entity_id' => $callId,
                        'data' => array_merge($group->data ?? [], $data, ['count' => $count]),
                    ]);
                    $group->save();
                    $this->storeEvent($group->id, $eventKey);
                    $group->load('actor');

                    return [
                        'duplicate' => false,
                        'created' => false,
                        'updated' => true,
                        'notification' => $group,
                    ];
                }

                $notification = Notification::query()->create([
                    'user_id' => $recipientId,
                    'type' => Notification::TYPE_MISSED_VIDEO_CALL,
                    'title' => $title,
                    'message' => $this->missedVideoCallMessage(1),
                    'count' => 1,
                    'is_read' => false,
                    'actor_id' => $callerId,
                    'entity_id' => $callId,
                    'data' => $data + ['count' => 1],
                ]);
                $this->storeEvent($notification->id, $eventKey);
                $notification->load('actor');

                return [
                    'duplicate' => false,
                    'created' => true,
                    'updated' => false,
                    'notification' => $notification,
                ];
            });
        } catch (QueryException $exception) {
            if (!$this->isUniqueViolation($exception)) {
                throw $exception;
            }

            $existingEvent = NotificationEvent::query()->where('event_key', $eventKey)->first();
            $notification = $existingEvent
                ? Notification::query()->with('actor')->find($existingEvent->notification_id)
                : null;

            return [
                'duplicate' => true,
                'created' => false,
                'updated' => false,
                'notification' => $notification,
            ];
        }
    }

    public function create(array $input): Notification
    {
        $notification = Notification::query()->create([
            'user_id' => (int) $input['user_id'],
            'type' => (string) $input['type'],
            'title' => $input['title'] ?? null,
            'message' => $input['message'] ?? null,
            'count' => max(1, (int) ($input['count'] ?? 1)),
            'is_read' => false,
            'actor_id' => isset($input['actor_id']) ? (int) $input['actor_id'] : null,
            'entity_id' => isset($input['entity_id']) ? (string) $input['entity_id'] : null,
            'data' => $input['data'] ?? null,
        ]);

        $notification->load('actor');

        return $notification;
    }

    public function listForUser(int $userId, int $limit, ?int $beforeId): array
    {
        $limit = max(1, min($limit, 50));

        $query = Notification::query()
            ->with('actor')
            ->where('user_id', $userId)
            ->orderByDesc('id');

        if ($beforeId !== null && $beforeId > 0) {
            $query->where('id', '<', $beforeId);
        }

        $notifications = $query->limit($limit + 1)->get();
        $hasMore = $notifications->count() > $limit;
        $page = $notifications->take($limit)->values();

        return [
            'notifications' => $page,
            'has_more' => $hasMore,
            'next_before_id' => $hasMore ? (int) $page->last()->id : null,
        ];
    }

    public function unreadCount(int $userId): int
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->where('is_read', false)
            ->count();
    }

    public function markAsRead(Notification $notification): Notification
    {
        if (!$notification->is_read) {
            $notification->is_read = true;
            $notification->save();
        }

        $notification->load('actor');

        return $notification;
    }

    public function markAllAsRead(int $userId): int
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);
    }

    public function serialize(?Notification $notification): ?array
    {
        if (!$notification) {
            return null;
        }

        $actor = $notification->actor;

        return [
            'id' => (int) $notification->id,
            'user_id' => (int) $notification->user_id,
            'type' => (string) $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'count' => (int) $notification->count,
            'is_read' => (bool) $notification->is_read,
            'actor_id' => $notification->actor_id !== null ? (int) $notification->actor_id : null,
            'entity_id' => $notification->entity_id,
            'data' => $notification->data,
            'created_at' => $notification->created_at?->toISOString(),
            'updated_at' => $notification->updated_at?->toISOString(),
            'actor' => $actor
                ? [
                    'id' => (int) $actor->id,
                    'name' => $actor->name,
                    'username' => $actor->username,
                    'profile_image' => $actor->profile_image_url,
                    'is_active' => (bool) $actor->is_active,
                ]
                : null,
        ];
    }

    public function missedVideoCallMessage(int $count): string
    {
        return $count === 1
            ? 'Имате 1 пропуснато видео обаждане!'
            : 'Имате ' . $count . ' пропуснати видео обаждания!';
    }

    private function storeEvent(int $notificationId, string $eventKey): void
    {
        NotificationEvent::query()->create([
            'notification_id' => $notificationId,
            'event_key' => $eventKey,
        ]);
    }

    private function isUniqueViolation(Throwable $exception): bool
    {
        $code = (string) $exception->getCode();
        $message = $exception->getMessage();

        return $code === '23000'
            || str_contains($message, 'uk_notification_events_key')
            || str_contains($message, 'Duplicate entry');
    }
}
