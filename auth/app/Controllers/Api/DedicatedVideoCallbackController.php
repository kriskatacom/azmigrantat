<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Services\DedicatedVideoCallbackService;
use App\Services\VideoReadyNotificationService;
use App\Services\VideoEnhancementCallbackService;
use App\Services\VideoEnhancementReadyNotificationService;
use RuntimeException;

final class DedicatedVideoCallbackController extends BaseController
{
    public function handle()
    {
        $rawBody = file_get_contents('php://input') ?: '';

        $decoded = json_decode($rawBody, true);
        if (is_array($decoded) && ($decoded['event_type'] ?? '') === 'video_enhancement') {
            try {
                $result = (new VideoEnhancementCallbackService())->handle($rawBody, $_SERVER['HTTP_X_VIDEO_SERVICE_SIGNATURE'] ?? null, $_SERVER['HTTP_X_VIDEO_SERVICE_TIMESTAMP'] ?? null);
            } catch (RuntimeException $exception) {
                error_log('[DedicatedVideoCallback] enhancement rejected: ' . $exception->getMessage());
                return $this->json(['success' => false, 'message' => $exception->getMessage()], 401);
            }
            if (!$result['duplicate'] && $result['status'] === 'completed') (new VideoEnhancementReadyNotificationService())->notify($result['job']);
            return $this->json(['success' => true, 'duplicate' => $result['duplicate'], 'status' => $result['status'], 'video_id' => (int) $result['job']->video_id, 'job_id' => (string) $result['job']->job_id]);
        }

        try {
            $result = (new DedicatedVideoCallbackService())->handle(
                $rawBody,
                $_SERVER['HTTP_X_VIDEO_SERVICE_SIGNATURE'] ?? null,
                $_SERVER['HTTP_X_VIDEO_SERVICE_TIMESTAMP'] ?? null,
            );
        } catch (RuntimeException $exception) {
            error_log('[DedicatedVideoCallback] rejected: ' . $exception->getMessage());

            return $this->json(['success' => false, 'message' => $exception->getMessage()], 401);
        }

        if (!$result['duplicate'] && $result['status'] === 'ready') {
            (new VideoReadyNotificationService())->notify($result['video']);
        }

        return $this->json([
            'success' => true,
            'duplicate' => $result['duplicate'],
            'status' => $result['status'],
            'video_id' => (int) $result['video']->id,
        ]);
    }
}
