<?php

namespace App\Services;

use App\Models\Video;
use Carbon\Carbon;
use RuntimeException;

final class DedicatedVideoCallbackService
{
    private const ACCEPTED_STATUSES = ['uploaded', 'queued', 'processing', 'ready', 'failed'];

    public function __construct(private readonly DedicatedVideoProvider $provider = new DedicatedVideoProvider())
    {
    }

    /**
     * @return array{duplicate: bool, status: string, video: Video}
     */
    public function handle(string $rawBody, ?string $signature, ?string $timestamp): array
    {
        if (!$this->provider->verifySignedCallback($rawBody, $signature, $timestamp)) {
            throw new RuntimeException('Невалиден Dedicated callback подпис.');
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            throw new RuntimeException('Невалиден Dedicated callback JSON.');
        }

        $videoId = (int) ($payload['video_id'] ?? 0);
        $userId = (int) ($payload['user_id'] ?? 0);
        $uploadId = trim((string) ($payload['upload_id'] ?? $payload['provider_video_id'] ?? ''));
        $status = strtolower(trim((string) ($payload['status'] ?? '')));
        if ($videoId < 1 || $userId < 1 || $uploadId === '' || !in_array($status, self::ACCEPTED_STATUSES, true)) {
            throw new RuntimeException('Невалидни Dedicated callback данни.');
        }

        // Both owner and provider identity are checked. A signed callback for
        // another user's video is still rejected instead of being trusted.
        $video = Video::query()
            ->whereKey($videoId)
            ->where('user_id', $userId)
            ->where('provider', 'oneprovider')
            ->where('provider_video_id', $uploadId)
            ->first();
        if (!$video) {
            throw new RuntimeException('Dedicated callback video ownership mismatch.');
        }

        if ($status === 'ready' && trim((string) ($payload['playback_url'] ?? '')) === '') {
            throw new RuntimeException('Ready callback must include a playback URL.');
        }

        $wasReady = $video->status === Video::STATUS_READY;
        $previousProcessingStatus = (string) ($video->processing_status ?? '');
        if ($video->status === Video::STATUS_READY && $status !== 'ready') {
            return ['duplicate' => true, 'status' => 'ready', 'video' => $video];
        }
        if ($video->status === Video::STATUS_FAILED && $status !== 'failed') {
            return ['duplicate' => true, 'status' => 'failed', 'video' => $video];
        }
        if ($previousProcessingStatus === $status && ($status !== 'ready' || trim((string) $video->playback_url) !== '')) {
            return ['duplicate' => true, 'status' => $status, 'video' => $video];
        }

        $video->processing_status = $status;
        if ($status === 'ready') {
            $video->status = Video::STATUS_READY;
            $video->processed_at = $video->processed_at ?: Carbon::now();
            $video->failed_at = null;
            $video->failure_reason = null;
            $video->playback_url = trim((string) $payload['playback_url']);
        } elseif ($status === 'failed') {
            $video->status = Video::STATUS_FAILED;
            $video->failed_at = Carbon::now();
            $video->failure_reason = trim((string) ($payload['failure_reason'] ?? 'Видеообработката е неуспешна.')) ?: 'Видеообработката е неуспешна.';
        } else {
            $video->status = Video::STATUS_PROCESSING;
            $video->uploaded_at = $video->uploaded_at ?: Carbon::now();
        }

        foreach (['storage_path', 'thumbnail_url'] as $field) {
            if (array_key_exists($field, $payload) && is_string($payload[$field])) {
                $video->{$field} = trim($payload[$field]) ?: null;
            }
        }
        if (isset($payload['duration']) && is_numeric($payload['duration'])) {
            $video->duration = max(0, (float) $payload['duration']);
            $video->duration_seconds = (int) round((float) $payload['duration']);
        }
        if (isset($payload['file_size']) && is_numeric($payload['file_size'])) {
            $video->file_size = max(0, (int) $payload['file_size']);
        }
        foreach (['width', 'height'] as $field) {
            if (isset($payload[$field]) && is_numeric($payload[$field])) {
                $video->{$field} = max(0, (int) $payload[$field]);
            }
        }
        $video->save();

        return ['duplicate' => $wasReady === ($video->status === Video::STATUS_READY) && $status === 'ready', 'status' => $status, 'video' => $video->refresh()];
    }
}
