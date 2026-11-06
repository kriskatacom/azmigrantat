<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Services\DedicatedVideoCallbackService;
use App\Services\VideoReadyNotificationService;
use RuntimeException;

final class DedicatedVideoCallbackController extends BaseController
{
    public function handle()
    {
        $rawBody = file_get_contents('php://input') ?: '';

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
