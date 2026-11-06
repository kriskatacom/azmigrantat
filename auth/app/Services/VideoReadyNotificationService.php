<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Video;

final class VideoReadyNotificationService
{
    public function notify(Video $video): void
    {
        try {
            $result = (new NotificationService())->recordVideoReady((int) $video->user_id, (int) $video->id, (string) $video->title);
            if (($result['duplicate'] ?? false) || !$result['notification']) return;

            $notificationService = new NotificationService();
            $payload = $notificationService->serialize($result['notification']);
            $user = $video->owner()->first();
            if ($user && $payload) {
                (new PushNotificationService())->sendToUser($user, 'Видеото е готово', (string) $payload['message'], [
                    'type' => Notification::TYPE_VIDEO_READY,
                    'notification_id' => (string) $payload['id'],
                    'video_id' => (string) $video->id,
                ], null, 'video_ready');
            }
            if ($payload) (new RealtimeNotifier())->notifyNotification((int) $video->user_id, $payload, 'notification:new');
        } catch (\Throwable $exception) {
            error_log('[VideoReadyNotification] failed video_id=' . (int) $video->id . ': ' . $exception->getMessage());
        }
    }
}
