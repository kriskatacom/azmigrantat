<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\VideoEnhancementJob;

final class VideoEnhancementReadyNotificationService
{
    public function notify(VideoEnhancementJob $job): void
    {
        try {
            $video = $job->video()->first(); $user = $video?->owner()->first();
            if (!$video || !$user) return;
            $notification = (new NotificationService())->create([
                'user_id' => (int) $job->user_id,
                'type' => Notification::TYPE_VIDEO_ENHANCEMENT_READY,
                'title' => 'Подобреното видео е готово',
                'message' => '„' . (string) $video->title . '“ е обработено и е готово за преглед.',
                'actor_id' => (int) $job->user_id,
                'entity_id' => (string) $job->job_id,
                'data' => ['video_id' => (int) $job->video_id, 'enhancement_job_id' => (string) $job->job_id],
            ]);
            $payload = (new NotificationService())->serialize($notification);
            if ($payload) {
                (new PushNotificationService())->sendToUser($user, 'Подобреното видео е готово', (string) $payload['message'], ['type' => Notification::TYPE_VIDEO_ENHANCEMENT_READY, 'notification_id' => (string) $payload['id'], 'video_id' => (string) $job->video_id, 'enhancement_job_id' => (string) $job->job_id], null, 'video_ready');
                (new RealtimeNotifier())->notifyNotification((int) $job->user_id, $payload, 'notification:new');
            }
        } catch (\Throwable $exception) { error_log('[VideoEnhancementReadyNotification] ' . $exception->getMessage()); }
    }
}
