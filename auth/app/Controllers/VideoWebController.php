<?php

namespace App\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Video;
use App\Models\OauthAccessToken;
use App\Models\OauthApp;

final class VideoWebController extends BaseController
{
    public function index(): void
    {
        $this->renderWithLayout('admin/videos/index', [
            'title' => 'Видеоклипове',
            'description' => ''
        ]);
    }

    public function create(): void
    {
        $this->renderWithLayout('admin/videos/form', [
            'title' => 'Нова публикация с видео',
            'description' => 'Създаване на нов видеоклип.'
        ], ['videoId' => null]);
    }

    public function edit($id): void
    {
        $this->renderWithLayout('admin/videos/form', [
            'title' => 'Редактиране на видео',
            'description' => 'Редактиране на заглавие, описание и thumbnail.'
        ], ['videoId' => (int) $id]);
    }

    public function data(): void
    {
        $userId = AuthHelper::id();
        if (!$userId) {
            $this->json(['success' => false, 'message' => 'Сесията е изтекла.'], 401);
        }

        $videos = Video::query()
            ->where('user_id', (int) $userId)
            ->latest('created_at')
            ->limit(100)
            ->get()
            ->map(static fn (Video $video): array => [
                'id' => (int) $video->id,
                'title' => $video->title,
                'description' => $video->description,
                'thumbnail_url' => $video->thumbnail_url,
                'status' => $video->status,
                'bunny_status' => $video->bunny_status,
                'mime_type' => $video->mime_type,
                'file_size' => (int) $video->file_size,
                'duration_seconds' => (int) $video->duration_seconds,
                'width' => (int) $video->width,
                'height' => (int) $video->height,
                'total_views' => (int) $video->total_views,
                'unique_viewers' => (int) $video->unique_viewers,
                'created_at' => $video->created_at?->toIso8601String(),
                'uploaded_at' => $video->uploaded_at?->toIso8601String(),
                'processed_at' => $video->processed_at?->toIso8601String(),
                'failure_reason' => $video->failure_reason,
            ])
            ->values();

        $this->json(['success' => true, 'data' => $videos]);
    }

    public function sessionToken(): void
    {
        $userId = AuthHelper::id();
        if (!$userId) {
            $this->json(['success' => false, 'message' => 'Сесията е изтекла.'], 401);
        }

        $app = OauthApp::query()->where('is_active', true)->orderBy('id')->first();
        if (!$app) {
            $this->json(['success' => false, 'message' => 'Няма конфигурирано OAuth приложение.'], 503);
        }

        $expiresAt = date('Y-m-d H:i:s', time() + 900);
        $tokens = OauthAccessToken::issue((int) $userId, (int) $app->id, $expiresAt, $expiresAt, false);

        $this->json([
            'success' => true,
            'access_token' => $tokens['access_token'],
            'expires_in' => 900,
        ]);
    }
}
