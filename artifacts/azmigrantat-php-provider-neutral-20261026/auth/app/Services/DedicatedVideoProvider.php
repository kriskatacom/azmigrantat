<?php

namespace App\Services;

use App\Contracts\VideoStorageProvider;
use App\Models\Video;
use RuntimeException;

final class DedicatedVideoProvider implements VideoStorageProvider
{
    private string $serviceUrl;
    private string $tokenSecret;
    private string $adminSecret;
    private string $callbackSecret;
    private string $publicUrl;
    private int $maxUploadBytes;
    private int $tokenTtlSeconds;

    public function __construct()
    {
        $this->serviceUrl = rtrim(trim((string) env('VIDEO_SERVICE_URL', '')), '/');
        $this->tokenSecret = trim((string) env('VIDEO_SERVICE_TOKEN_SECRET', ''));
        $this->adminSecret = trim((string) env('VIDEO_SERVICE_ADMIN_SECRET', ''));
        $this->callbackSecret = trim((string) env('VIDEO_SERVICE_CALLBACK_SECRET', ''));
        $this->publicUrl = rtrim(trim((string) env('VIDEO_SERVICE_PUBLIC_URL', $this->serviceUrl)), '/');
        $this->maxUploadBytes = max(1, (int) env('VIDEO_SERVICE_MAX_UPLOAD_BYTES', 2 * 1024 * 1024 * 1024));
        $this->tokenTtlSeconds = max(60, min(3600, (int) env('VIDEO_SERVICE_TOKEN_TTL_SECONDS', 900)));
    }

    public function key(): string
    {
        return 'oneprovider';
    }

    public function isConfigured(): bool
    {
        return $this->serviceUrl !== '' && $this->tokenSecret !== '' && $this->callbackSecret !== '';
    }

    public function createUpload(string $title, ?Video $video = null): array
    {
        unset($title);

        if (!$video || (int) $video->id < 1 || (int) $video->user_id < 1) {
            throw new RuntimeException('Dedicated upload requires a persisted video and owner.');
        }
        if (!$this->isConfigured()) {
            throw new RuntimeException('Dedicated video service не е конфигурирана.');
        }

        $uploadId = $this->uuid();
        return $this->uploadData($video, $uploadId, $this->tokenTtlSeconds);
    }

    public function uploadAuthorization(string $storageId, int $ttlSeconds = 3600): array
    {
        $video = Video::query()->where('provider', $this->key())->where('provider_video_id', $storageId)->first();
        if (!$video) {
            throw new RuntimeException('Dedicated upload не е намерен.');
        }

        $previousTtl = $this->tokenTtlSeconds;
        $this->tokenTtlSeconds = max(60, min(3600, $ttlSeconds));
        try {
            return $this->uploadData($video, $storageId, $this->tokenTtlSeconds)['provider_data'];
        } finally {
            $this->tokenTtlSeconds = $previousTtl;
        }
    }

    public function updateTitle(Video $video, string $title): void
    {
        // Title is PHP metadata. Task 3 has no remote metadata endpoint, so do
        // not send an unverified request to an endpoint that does not exist.
        unset($video, $title);
    }

    public function delete(Video $video): void
    {
        if (trim((string) $video->provider_video_id) === '') {
            return;
        }

        if ($this->adminSecret === '' || (int) $video->id < 1 || (int) $video->user_id < 1) {
            throw new RuntimeException('Dedicated delete requires an administrative service secret and video ownership data.');
        }
        $token = $this->issueDeleteToken($video);
        $this->request('DELETE', '/v1/uploads/' . rawurlencode((string) $video->provider_video_id), $token);
    }

    public function remoteExists(Video $video): ?bool
    {
        // Task 3 intentionally exposes no remote inspection endpoint.
        unset($video);
        return null;
    }

    public function playbackUrl(Video $video, int $ttlSeconds = 900): string
    {
        unset($ttlSeconds);
        $url = trim((string) $video->playback_url);
        if ($url === '') {
            throw new RuntimeException('Dedicated video playback URL is not confirmed yet.');
        }

        return $url;
    }

    public function verifyCallback(
        string $rawBody,
        ?string $signature,
        ?string $version = null,
        ?string $algorithm = null,
    ): bool {
        if ($this->callbackSecret === '' || $signature === null || $version !== 'v1' || $algorithm !== 'hmac-sha256') {
            return false;
        }

        return hash_equals(hash_hmac('sha256', $rawBody, $this->callbackSecret), strtolower(trim($signature)));
    }

    public function verifySignedCallback(string $rawBody, ?string $signature, ?string $timestamp): bool
    {
        if ($this->callbackSecret === '' || $signature === null || !ctype_digit((string) $timestamp)) {
            return false;
        }

        $timestampValue = (int) $timestamp;
        if (abs(time() - $timestampValue) > 300) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestampValue . '.' . $rawBody, $this->callbackSecret);

        return hash_equals($expected, strtolower(trim($signature)));
    }

    /** @param array<string, int|string> $claims */
    private function issueUploadToken(array $claims): string
    {
        $header = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'AZM_UPLOAD'], JSON_THROW_ON_ERROR));
        $payload = $this->base64UrlEncode(json_encode($claims, JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', $header . '.' . $payload, $this->tokenSecret, true);

        return $header . '.' . $payload . '.' . $this->base64UrlEncode($signature);
    }

    private function issueDeleteToken(Video $video): string
    {
        $header = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'AZM_ADMIN'], JSON_THROW_ON_ERROR));
        $payload = $this->base64UrlEncode(json_encode([
            'action' => 'delete',
            'provider' => $this->key(),
            'upload_id' => (string) $video->provider_video_id,
            'user_id' => (int) $video->user_id,
            'video_id' => (int) $video->id,
            'exp' => time() + 300,
        ], JSON_THROW_ON_ERROR));
        return $header . '.' . $payload . '.' . $this->base64UrlEncode(hash_hmac('sha256', $header . '.' . $payload, $this->adminSecret, true));
    }

    /** @return array{storage_id: string, provider_data: array<string, mixed>} */
    private function uploadData(Video $video, string $uploadId, int $ttlSeconds): array
    {
        $expiresAt = time() + max(60, min(3600, $ttlSeconds));
        $mimeType = strtolower(trim((string) $video->mime_type));
        if ($mimeType === '') {
            throw new RuntimeException('Dedicated upload requires a MIME type.');
        }

        $token = $this->issueUploadToken([
            'upload_id' => $uploadId,
            'user_id' => (int) $video->user_id,
            'video_id' => (int) $video->id,
            'exp' => $expiresAt,
            'max_size' => min($this->maxUploadBytes, max(1, (int) $video->file_size)),
            'mime_type' => $mimeType,
        ]);

        return [
            'storage_id' => $uploadId,
            'provider_data' => [
                'provider' => $this->key(),
                'upload_id' => $uploadId,
                'user_id' => (int) $video->user_id,
                'video_id' => (int) $video->id,
                'endpoint' => $this->serviceUrl . '/v1/uploads',
                'authorization_token' => $token,
                'token_expires_at' => $expiresAt,
                'tus_resumable' => '1.0.0',
            ],
        ];
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    private function request(string $method, string $path, ?string $bearerToken = null): void
    {
        if ($this->serviceUrl === '') {
            throw new RuntimeException('Dedicated video service не е конфигурирана.');
        }

        $handle = curl_init($this->serviceUrl . $path);
        if ($handle === false) {
            throw new RuntimeException('Dedicated video request не може да бъде стартирана.');
        }
        $headers = ['Accept: application/json'];
        if ($bearerToken !== null) {
            $headers[] = 'Authorization: Bearer ' . $bearerToken;
        }
        curl_setopt_array($handle, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);
        $response = curl_exec($handle);
        $error = curl_error($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
        curl_close($handle);
        if ($response === false || $error !== '' || ($status < 200 || $status >= 300) && $status !== 404) {
            throw new RuntimeException('Dedicated video request failed.');
        }
    }
}
