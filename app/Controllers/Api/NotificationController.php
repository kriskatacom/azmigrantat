<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\Notification;
use App\Models\OauthAccessToken;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\RealtimeNotifier;

final class NotificationController extends BaseController
{
    private NotificationService $notifications;

    public function __construct()
    {
        $this->notifications = new NotificationService();
    }

    public function index()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $limit = (int) ($_GET['limit'] ?? 30);
        $beforeId = isset($_GET['before_id']) ? (int) $_GET['before_id'] : null;
        $result = $this->notifications->listForUser((int) $user->id, $limit, $beforeId);

        return $this->json([
            'success' => true,
            'data' => $result['notifications']
                ->map(fn (Notification $notification) => $this->notifications->serialize($notification))
                ->values(),
            'meta' => [
                'has_more' => $result['has_more'],
                'next_before_id' => $result['next_before_id'],
                'unread_count' => $this->notifications->unreadCount((int) $user->id),
            ],
        ]);
    }

    public function unreadCount()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        return $this->json([
            'success' => true,
            'data' => [
                'unread_count' => $this->notifications->unreadCount((int) $user->id),
            ],
        ]);
    }

    public function show($id)
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $notification = Notification::query()
            ->where('user_id', (int) $user->id)
            ->with('actor')
            ->find((int) $id);

        if (!$notification) {
            return $this->json([
                'success' => false,
                'message' => 'Известието не е намерено.',
            ], 404);
        }

        return $this->json([
            'success' => true,
            'data' => $this->notifications->serialize($notification),
            'meta' => [
                'unread_count' => $this->notifications->unreadCount((int) $user->id),
            ],
        ]);
    }

    public function markAsRead($id)
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $notification = Notification::query()
            ->where('user_id', (int) $user->id)
            ->find((int) $id);

        if (!$notification) {
            return $this->json([
                'success' => false,
                'message' => 'Известието не е намерено.',
            ], 404);
        }

        $updated = $this->notifications->markAsRead($notification);
        $payload = $this->notifications->serialize($updated);

        try {
            $this->realtime()->notifyNotification(
                (int) $user->id,
                $payload,
                'notification:updated'
            );
        } catch (\Throwable $exception) {
            error_log('[NotificationRead] realtime_failed id=' . (int) $notification->id);
        }

        return $this->json([
            'success' => true,
            'data' => $payload,
            'meta' => [
                'unread_count' => $this->notifications->unreadCount((int) $user->id),
            ],
        ]);
    }

    public function markAllAsRead()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $this->notifications->markAllAsRead((int) $user->id);
        try {
            $this->realtime()->notifyNotificationsReadAll((int) $user->id);
        } catch (\Throwable $exception) {
            error_log('[NotificationReadAll] realtime_failed user_id=' . (int) $user->id);
        }

        return $this->json([
            'success' => true,
            'data' => [
                'unread_count' => 0,
            ],
        ]);
    }

    public function deleteAll()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $this->notifications->deleteAll((int) $user->id);
        try {
            $this->realtime()->notifyNotificationsCleared((int) $user->id);
        } catch (\Throwable $exception) {
            error_log('[NotificationDeleteAll] realtime_failed user_id=' . (int) $user->id);
        }

        return $this->json([
            'success' => true,
            'data' => [
                'unread_count' => 0,
            ],
        ]);
    }

    public function destroy($id)
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $notification = Notification::query()
            ->where('user_id', (int) $user->id)
            ->find((int) $id);

        if (!$notification) {
            return $this->json([
                'success' => false,
                'message' => 'Известието не е намерено.',
            ], 404);
        }

        $payload = $this->notifications->serialize($notification);
        $this->notifications->deleteOne($notification);

        try {
            $this->realtime()->notifyNotification(
                (int) $user->id,
                $payload,
                'notification:deleted'
            );
        } catch (\Throwable $exception) {
            error_log('[NotificationDelete] realtime_failed id=' . (int) $id);
        }

        return $this->json([
            'success' => true,
            'data' => [
                'id' => (int) $id,
                'unread_count' => $this->notifications->unreadCount((int) $user->id),
            ],
        ]);
    }

    private function realtime(): RealtimeNotifier
    {
        return new RealtimeNotifier();
    }

    private function authenticatedUser(): ?User
    {
        return OauthAccessToken::userFromRequest();
    }

    private function unauthorized()
    {
        return $this->json([
            'success' => false,
            'message' => 'Необходима е автентикация.',
        ], 401);
    }
}
