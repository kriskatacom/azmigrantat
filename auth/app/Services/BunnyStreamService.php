<?php

namespace App\Services;

use App\Models\Video;
use RuntimeException;

final class BunnyStreamService
{
    private const API_BASE = 'https://video.bunnycdn.com';
    private const TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload';

    private int $libraryId;
    private string $apiKey;
    private string $readOnlyKey;
    private string $tokenKey;
    private string $cdnHost;

    public function __construct()
    {
        $this->libraryId = (int) env('BUNNY_STREAM_LIBRARY_ID', 0);
        $this->apiKey = trim((string) env('BUNNY_STREAM_API_KEY', ''));
        $this->readOnlyKey = trim((string) env('BUNNY_STREAM_READ_ONLY_API_KEY', ''));
        $this->tokenKey = trim((string) env('BUNNY_STREAM_TOKEN_SECURITY_KEY', ''));
        $this->cdnHost = trim((string) env('BUNNY_STREAM_CDN_HOST_NAME', ''));
    }

    public function isConfigured(): bool
    {
        return $this->libraryId > 0 && $this->apiKey !== '';
    }

    public function createVideo(string $title): array
    {
        $payload = $this->request('POST', self::API_BASE . '/library/' . $this->libraryId . '/videos', [
            'Content-Type: application/json',
            'Accept: application/json',
            'AccessKey: ' . $this->apiKey,
        ], json_encode(['title' => $title], JSON_THROW_ON_ERROR));

        if (!isset($payload['guid']) || !is_string($payload['guid'])) {
            throw new RuntimeException('Bunny не върна идентификатор на видеото.');
        }

        return $payload;
    }

    public function uploadCredentials(string $videoGuid, int $ttlSeconds = 3600): array
    {
        if (!$this->isConfigured()) {
            throw new RuntimeException('Bunny Stream не е конфигуриран.');
        }

        $expires = time() + max(900, min(86400, $ttlSeconds));
        $signature = hash('sha256', $this->libraryId . $this->apiKey . $expires . $videoGuid);

        return [
            'endpoint' => self::TUS_ENDPOINT,
            'library_id' => $this->libraryId,
            'video_id' => $videoGuid,
            'authorization_signature' => $signature,
            'authorization_expire' => $expires,
        ];
    }

    public function playbackUrl(Video $video, int $ttlSeconds = 900): string
    {
        if ($this->tokenKey === '' || $this->cdnHost === '') {
            throw new RuntimeException('Bunny Stream CDN token authentication не е конфигурирана.');
        }

        $expires = time() + max(60, min(3600, $ttlSeconds));
        $videoPath = '/' . trim($video->bunny_video_guid, '/') . '/';
        $playlistPath = $videoPath . 'playlist.m3u8';
        $signingData = 'token_path=' . $videoPath;
        $digest = hash_hmac('sha256', $videoPath . $expires . $signingData, $this->tokenKey, true);
        $token = 'HS256-' . rtrim(strtr(base64_encode($digest), '+/', '-_'), '=');

        return sprintf(
            'https://%s/bcdn_token=%s&token_path=%s&expires=%d%s',
            $this->cdnHost,
            $token,
            rawurlencode($videoPath),
            $expires,
            $playlistPath,
        );
    }

    public function verifyWebhook(string $rawBody, ?string $signature, ?string $version, ?string $algorithm): bool
    {
        if ($this->readOnlyKey === '' || $signature === null || $version !== 'v1' || $algorithm !== 'hmac-sha256') {
            return false;
        }

        $expected = hash_hmac('sha256', $rawBody, $this->readOnlyKey);

        return hash_equals($expected, strtolower(trim($signature)));
    }

    public function configuredLibraryId(): int
    {
        return $this->libraryId;
    }

    public function cdnHost(): string
    {
        return $this->cdnHost;
    }

    private function request(string $method, string $url, array $headers, ?string $body = null): array
    {
        $handle = curl_init($url);
        if ($handle === false) {
            throw new RuntimeException('Bunny заявката не може да бъде стартирана.');
        }

        curl_setopt_array($handle, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_POSTFIELDS => $body,
        ]);

        $response = curl_exec($handle);
        $error = curl_error($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
        curl_close($handle);

        if ($response === false || $error !== '') {
            throw new RuntimeException('Bunny заявката не успя: ' . ($error ?: 'неизвестна грешка'));
        }

        $decoded = json_decode($response, true);
        if ($status < 200 || $status >= 300 || !is_array($decoded)) {
            throw new RuntimeException('Bunny върна грешка при създаване на видеото.');
        }

        return $decoded;
    }
}
