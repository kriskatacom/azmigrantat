<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\Video;
use App\Services\VideoViewService;
use App\Models\Notification;
use App\Services\BackblazeB2Service;
use App\Services\BunnyStreamService;
use App\Services\NotificationService;
use App\Services\PushNotificationService;
use App\Services\RealtimeNotifier;
use Carbon\Carbon;
use RuntimeException;

final class VideoController extends BaseController
{
    public function index()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $videos = Video::query()
            ->where('status', Video::STATUS_READY)
            ->inRandomOrder()
            ->limit(min(100, max(1, (int) ($_GET['limit'] ?? 50))))
            ->get();

        return $this->json(['success' => true, 'data' => $videos->map(fn (Video $video) => $this->serialize($video))->values()]);
    }

    public function beginUpload()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $title = trim((string) ($input['title'] ?? $input['filename'] ?? 'Видео'));
        $description = trim((string) ($input['description'] ?? ''));
        $mimeType = strtolower(trim((string) ($input['mime_type'] ?? '')));
        $fileSize = (int) ($input['file_size'] ?? 0);

        if ($title === '' || mb_strlen($title) > 120) {
            return $this->json(['success' => false, 'message' => 'Заглавието трябва да е между 1 и 120 символа.'], 422);
        }

        if (mb_strlen($description) > 2000) {
            return $this->json(['success' => false, 'message' => 'Описанието не може да е по-дълго от 2000 символа.'], 422);
        }

        if (!in_array($mimeType, ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'], true)) {
            return $this->json(['success' => false, 'message' => 'Поддържат се MP4, MOV, M4V и WebM видеа.'], 422);
        }

        if ($fileSize < 1 || $fileSize > 2 * 1024 * 1024 * 1024) {
            return $this->json(['success' => false, 'message' => 'Размерът на видеото трябва да е до 2 GB.'], 422);
        }

        $bunny = new BunnyStreamService();
        if (!$bunny->isConfigured()) {
            return $this->json(['success' => false, 'message' => 'Видео услугата временно не е конфигурирана.'], 503);
        }

        try {
            $remote = $bunny->createVideo($title);
            $video = Video::query()->create([
                'user_id' => (int) $user->id,
                'bunny_library_id' => $bunny->configuredLibraryId(),
                'bunny_video_guid' => $remote['guid'],
                'title' => $title,
                'description' => $description !== '' ? $description : null,
                'status' => Video::STATUS_UPLOADING,
                'mime_type' => $mimeType,
                'file_size' => $fileSize,
            ]);
        } catch (RuntimeException $exception) {
            error_log('[Bunny Stream] upload initialization failed: ' . $exception->getMessage());

            return $this->json(['success' => false, 'message' => 'Видеото не може да бъде подготвено за качване.'], 502);
        }

        return $this->json([
            'success' => true,
            'data' => [
                'video' => $this->serialize($video),
                'upload' => $bunny->uploadCredentials($video->bunny_video_guid),
            ],
        ], 201);
    }

    public function uploadComplete($id)
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $video = Video::query()->where('id', (int) $id)->where('user_id', (int) $user->id)->first();
        if (!$video) {
            return $this->json(['success' => false, 'message' => 'Видеото не е намерено.'], 404);
        }

        $video->status = Video::STATUS_PROCESSING;
        $video->uploaded_at = $video->uploaded_at ?: Carbon::now();
        $video->save();

        return $this->json(['success' => true, 'data' => $this->serialize($video)]);
    }

    public function uploadThumbnail($id)
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $video = Video::query()->where('id', (int) $id)->where('user_id', (int) $user->id)->first();
        if (!$video) {
            return $this->json(['success' => false, 'message' => 'Видеото не е намерено.'], 404);
        }

        $file = $_FILES['thumbnail'] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return $this->json(['success' => false, 'message' => 'Избери изображение за thumbnail.'], 422);
        }

        if ((int) $file['size'] > 5 * 1024 * 1024 || @getimagesize($file['tmp_name']) === false) {
            return $this->json(['success' => false, 'message' => 'Thumbnail-ът трябва да е валидно изображение до 5 MB.'], 422);
        }

        $keyId = (string) ($_ENV['B2_KEY_ID'] ?? '');
        $applicationKey = (string) ($_ENV['B2_APPLICATION_KEY'] ?? '');
        $bucket = (string) ($_ENV['B2_BUCKET'] ?? '');
        $endpoint = (string) ($_ENV['B2_ENDPOINT'] ?? '');
        $region = (string) ($_ENV['B2_REGION'] ?? '');
        $cdn = (string) ($_ENV['B2_CDN_BASE_URL'] ?? '');
        if ($keyId === '' || $applicationKey === '' || $bucket === '' || $endpoint === '' || $region === '') {
            return $this->json(['success' => false, 'message' => 'Файловото хранилище временно не е конфигурирано.'], 503);
        }

        try {
            $extension = strtolower(pathinfo((string) $file['name'], PATHINFO_EXTENSION)) ?: 'jpg';
            $previousThumbnailUrl = $video->thumbnail_url;
            $storage = new BackblazeB2Service($keyId, $applicationKey, $bucket, $endpoint, $region, $cdn);
            $remotePath = sprintf('video-thumbnails/%d/%d-%s.%s', $user->id, $video->id, bin2hex(random_bytes(8)), $extension);
            $stored = $storage->upload((string) $file['tmp_name'], $remotePath, (string) ($file['type'] ?? 'image/jpeg'));
            $video->thumbnail_url = $storage->url($stored['key']);
            $video->save();
            $this->deleteThumbnailUrl($previousThumbnailUrl);
        } catch (\Throwable $exception) {
            error_log('[Video thumbnail] upload failed: ' . $exception->getMessage());
            return $this->json(['success' => false, 'message' => 'Thumbnail-ът не можа да бъде качен.'], 502);
        }

        return $this->json(['success' => true, 'data' => $this->serialize($video)]);
    }

    public function update($id)
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $video = Video::query()->where('id', (int) $id)->where('user_id', (int) $user->id)->first();
        if (!$video) {
            return $this->json(['success' => false, 'message' => 'Видеото не е намерено.'], 404);
        }

        $input = $this->jsonInput();
        $title = trim((string) ($input['title'] ?? ''));
        $description = trim((string) ($input['description'] ?? ''));
        if ($title === '' || mb_strlen($title) > 120) {
            return $this->json(['success' => false, 'message' => 'Заглавието трябва да е между 1 и 120 символа.'], 422);
        }
        if (mb_strlen($description) > 2000) {
            return $this->json(['success' => false, 'message' => 'Описанието не може да е по-дълго от 2000 символа.'], 422);
        }

        try {
            (new BunnyStreamService())->updateVideoTitle($video, $title);
            $video->title = $title;
            $video->description = $description !== '' ? $description : null;
            $video->save();
        } catch (RuntimeException $exception) {
            error_log('[Bunny Stream] video update failed: ' . $exception->getMessage());
            return $this->json(['success' => false, 'message' => 'Видеото не можа да бъде редактирано.'], 502);
        }

        return $this->json(['success' => true, 'data' => $this->serialize($video)]);
    }

    public function destroy($id)
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $video = Video::query()->where('id', (int) $id)->where('user_id', (int) $user->id)->first();
        if (!$video) {
            return $this->json(['success' => false, 'message' => 'Видеото не е намерено.'], 404);
        }

        try {
            (new BunnyStreamService())->deleteVideo($video);
        } catch (RuntimeException $exception) {
            error_log('[Bunny Stream] video deletion failed: ' . $exception->getMessage());
            return $this->json(['success' => false, 'message' => 'Видеото не можа да бъде изтрито.'], 502);
        }

        $this->deleteThumbnailUrl($video->thumbnail_url);
        $video->delete();

        return $this->json(['success' => true]);
    }

    public function destroyAll()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $videos = Video::query()->where('user_id', (int) $user->id)->get();
        $deleted = 0;
        $failed = 0;
        $bunny = new BunnyStreamService();

        foreach ($videos as $video) {
            try {
                $bunny->deleteVideo($video);
                $this->deleteThumbnailUrl($video->thumbnail_url);
                $video->delete();
                $deleted++;
            } catch (RuntimeException $exception) {
                $failed++;
                error_log(sprintf(
                    '[Bunny Stream] bulk video deletion failed id=%d: %s',
                    (int) $video->id,
                    $exception->getMessage(),
                ));
            }
        }

        if ($failed > 0) {
            return $this->json([
                'success' => false,
                'message' => 'Част от видеоклиповете не можаха да бъдат изтрити.',
                'data' => ['deleted' => $deleted, 'failed' => $failed],
            ], 502);
        }

        return $this->json([
            'success' => true,
            'data' => ['deleted' => $deleted, 'failed' => 0],
        ]);
    }

    public function playback($id)
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $video = Video::query()->where('id', (int) $id)->where('status', Video::STATUS_READY)->first();
        if (!$video) {
            return $this->json(['success' => false, 'message' => 'Видеото все още не е готово или не съществува.'], 404);
        }

        try {
            $url = (new BunnyStreamService())->playbackUrl($video);
        } catch (RuntimeException $exception) {
            error_log('[Bunny Stream] playback token failed: ' . $exception->getMessage());

            return $this->json(['success' => false, 'message' => 'Защитеното възпроизвеждане временно не е налично.'], 503);
        }

        return $this->json(['success' => true, 'data' => ['url' => $url, 'expires_at' => time() + 900]]);
    }

    public function recordView($id)
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $video = Video::query()
            ->where('id', (int) $id)
            ->where('status', Video::STATUS_READY)
            ->first();
        if (!$video) {
            return $this->json(['success' => false, 'message' => 'Видеото не е намерено.'], 404);
        }

        try {
            $video = (new VideoViewService())->record($video, (int) $user->id);
        } catch (\Throwable $exception) {
            error_log(sprintf('[VideoView] failed video_id=%d user_id=%d: %s', (int) $video->id, (int) $user->id, $exception->getMessage()));
            return $this->json(['success' => false, 'message' => 'Гледането не можа да бъде отчетено.'], 503);
        }

        return $this->json([
            'success' => true,
            'data' => [
                'video_id' => (int) $video->id,
                'total_views' => (int) $video->total_views,
                'unique_viewers' => (int) $video->unique_viewers,
            ],
        ]);
    }

    public function webhook()
    {
        $rawBody = file_get_contents('php://input') ?: '';
        $bunny = new BunnyStreamService();

        error_log(sprintf(
            '[BunnyWebhook] received bytes=%d version=%s algorithm=%s',
            strlen($rawBody),
            (string) ($_SERVER['HTTP_X_BUNNYSTREAM_SIGNATURE_VERSION'] ?? ''),
            (string) ($_SERVER['HTTP_X_BUNNYSTREAM_SIGNATURE_ALGORITHM'] ?? ''),
        ));

        if (!$bunny->verifyWebhook(
            $rawBody,
            $_SERVER['HTTP_X_BUNNYSTREAM_SIGNATURE'] ?? null,
            $_SERVER['HTTP_X_BUNNYSTREAM_SIGNATURE_VERSION'] ?? null,
            $_SERVER['HTTP_X_BUNNYSTREAM_SIGNATURE_ALGORITHM'] ?? null,
        )) {
            error_log('[BunnyWebhook] rejected invalid signature');
            return $this->json(['success' => false, 'message' => 'Невалиден webhook подпис.'], 401);
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            error_log('[BunnyWebhook] rejected invalid JSON');
            return $this->json(['success' => false, 'message' => 'Невалиден webhook JSON.'], 422);
        }

        $libraryId = (int) ($payload['VideoLibraryId'] ?? 0);
        $guid = (string) ($payload['VideoGuid'] ?? '');
        $status = (int) ($payload['Status'] ?? -1);

        if ($libraryId !== $bunny->configuredLibraryId() || $guid === '') {
            error_log(sprintf('[BunnyWebhook] rejected payload library_id=%d guid_present=%s', $libraryId, $guid !== '' ? 'yes' : 'no'));
            return $this->json(['success' => false, 'message' => 'Невалидни webhook данни.'], 422);
        }

        $video = Video::query()->where('bunny_library_id', $libraryId)->where('bunny_video_guid', $guid)->first();
        if (!$video) {
            error_log('[BunnyWebhook] ignored unknown video guid=' . $guid);
            return $this->json(['success' => true]);
        }

        $wasReady = $video->status === Video::STATUS_READY;
        $video->bunny_status = $status;
        if (in_array($status, [3, 4], true)) {
            $video->status = Video::STATUS_READY;
            $video->processed_at = $video->processed_at ?: Carbon::now();
            $video->failed_at = null;
            $video->failure_reason = null;
        } elseif (in_array($status, [5, 8], true)) {
            $video->status = Video::STATUS_FAILED;
            $video->failed_at = Carbon::now();
        } elseif ($status >= 0 && $video->status !== Video::STATUS_READY) {
            $video->status = Video::STATUS_PROCESSING;
        }
        $video->save();

        error_log(sprintf(
            '[BunnyWebhook] accepted video_id=%d guid=%s bunny_status=%d app_status=%s',
            (int) $video->id,
            $guid,
            $status,
            (string) $video->status,
        ));

        if (!$wasReady && $video->status === Video::STATUS_READY) {
            $this->notifyVideoReady($video);
        }

        return $this->json(['success' => true]);
    }

    private function serialize(Video $video): array
    {
        return [
            'id' => (int) $video->id,
            'title' => $video->title,
            'description' => $video->description,
            'thumbnail_url' => $video->thumbnail_url,
            'status' => $video->status,
            'bunny_status' => $video->bunny_status,
            'mime_type' => $video->mime_type,
            'file_size' => $video->file_size,
            'total_views' => (int) $video->total_views,
            'unique_viewers' => (int) $video->unique_viewers,
            'created_at' => $video->created_at?->toIso8601String(),
        ];
    }

    private function deleteThumbnailUrl(?string $thumbnailUrl): void
    {
        $key = BackblazeB2Service::extractObjectKey($thumbnailUrl);
        if (!$key) {
            return;
        }

        $config = [
            (string) ($_ENV['B2_KEY_ID'] ?? ''),
            (string) ($_ENV['B2_APPLICATION_KEY'] ?? ''),
            (string) ($_ENV['B2_BUCKET'] ?? ''),
            (string) ($_ENV['B2_ENDPOINT'] ?? ''),
            (string) ($_ENV['B2_REGION'] ?? ''),
        ];
        if (in_array('', $config, true)) {
            return;
        }

        try {
            (new BackblazeB2Service($config[0], $config[1], $config[2], $config[3], $config[4], (string) ($_ENV['B2_CDN_BASE_URL'] ?? '')))->delete($key);
        } catch (\Throwable $exception) {
            error_log('[Video thumbnail] deletion failed: ' . $exception->getMessage());
        }
    }

    private function jsonInput(): array
    {
        $decoded = json_decode(file_get_contents('php://input') ?: '{}', true);

        return is_array($decoded) ? $decoded : [];
    }

    private function unauthorized()
    {
        return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);
    }

    private function notifyVideoReady(Video $video): void
    {
        try {
            $result = (new NotificationService())->recordVideoReady(
                (int) $video->user_id,
                (int) $video->id,
                (string) $video->title,
            );

            if (($result['duplicate'] ?? false) || !$result['notification']) {
                return;
            }

            $notificationService = new NotificationService();
            $payload = $notificationService->serialize($result['notification']);
            $user = $video->owner()->first();

            if ($user && $payload) {
                (new PushNotificationService())->sendToUser(
                    $user,
                    'Видеото е готово',
                    (string) $payload['message'],
                    [
                        'type' => Notification::TYPE_VIDEO_READY,
                        'notification_id' => (string) $payload['id'],
                        'video_id' => (string) $video->id,
                    ],
                    null,
                    'video_ready',
                );
            }

            if ($payload) {
                (new RealtimeNotifier())->notifyNotification(
                    (int) $video->user_id,
                    $payload,
                    'notification:new',
                );
            }
        } catch (\Throwable $exception) {
            error_log('[VideoReadyNotification] failed video_id=' . (int) $video->id . ': ' . $exception->getMessage());
        }
    }
}
