<?php

namespace App\Services;

use App\Models\Video;
use RuntimeException;

final class VideoEnhancementService
{
    private string $serviceUrl;
    private string $adminSecret;
    public function __construct()
    {
        $this->serviceUrl = rtrim(trim((string) env('VIDEO_SERVICE_URL', '')), '/');
        $this->adminSecret = trim((string) env('VIDEO_SERVICE_ADMIN_SECRET', ''));
    }
    public function isEnabledFor($user): bool
    {
        if (!filter_var(env('VIDEO_ENHANCEMENT_ENABLED', false), FILTER_VALIDATE_BOOLEAN)) return false;
        $allowed = array_values(array_filter(array_map('trim', explode(',', strtolower((string) env('VIDEO_ENHANCEMENT_ALLOWED_EMAILS', ''))))));
        return $allowed !== [] && in_array(strtolower(trim((string) ($user->email ?? ''))), $allowed, true);
    }
    public function isAiEnabledFor($user): bool
    {
        if (!filter_var(env('VIDEO_ENHANCEMENT_AI_ENABLED', false), FILTER_VALIDATE_BOOLEAN)) return false;
        $allowedEmails = array_values(array_filter(array_map('trim', explode(',', strtolower((string) env('VIDEO_ENHANCEMENT_AI_ALLOWED_EMAILS', ''))))));
        $allowedUserIds = array_values(array_filter(array_map('trim', explode(',', (string) env('VIDEO_ENHANCEMENT_AI_ALLOWED_USER_IDS', ''))), static fn ($value) => ctype_digit($value) && (int) $value > 0));
        return $allowedEmails !== [] && $allowedUserIds !== []
            && !empty($user->email_verified)
            && in_array(strtolower(trim((string) ($user->email ?? ''))), $allowedEmails, true)
            && in_array((string) ((int) ($user->id ?? 0)), $allowedUserIds, true);
    }
    public function options(Video $video, bool $aiAllowed = false): array { return $this->request('GET', '/v1/enhancements/options', $video, null, $aiAllowed); }
    public function start(Video $video, array $input, bool $aiAllowed = false): array { return $this->request('POST', '/v1/enhancements', $video, $input, $aiAllowed); }
    public function status(Video $video, string $jobId): array { return $this->request('GET', '/v1/enhancements/' . rawurlencode($jobId), $video); }
    public function cancel(Video $video, string $jobId): array { return $this->request('DELETE', '/v1/enhancements/' . rawurlencode($jobId), $video); }

    private function request(string $method, string $path, Video $video, ?array $payload = null, bool $aiAllowed = false): array
    {
        if ($this->serviceUrl === '' || $this->adminSecret === '' || $video->provider !== 'oneprovider' || trim((string) $video->provider_video_id) === '') throw new RuntimeException('Подобряването не е конфигурирано за това видео.');
        $handle = curl_init($this->serviceUrl . $path);
        if ($handle === false) throw new RuntimeException('Видео услугата не може да бъде стартирана.');
        $headers = ['Accept: application/json', 'Authorization: Bearer ' . $this->token($video, $aiAllowed)];
        $options = [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 15];
        if ($payload !== null) { $body = json_encode($payload, JSON_THROW_ON_ERROR); $headers[] = 'Content-Type: application/json'; $options[CURLOPT_HTTPHEADER] = $headers; $options[CURLOPT_POSTFIELDS] = $body; }
        curl_setopt_array($handle, $options);
        $response = curl_exec($handle); $error = curl_error($handle); $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE); curl_close($handle);
        $decoded = is_string($response) ? json_decode($response, true) : null;
        if ($response === false || $error !== '' || !is_array($decoded)) throw new RuntimeException('Видео услугата временно не отговаря.');
        if ($status < 200 || $status >= 300 || !($decoded['success'] ?? false) || !is_array($decoded['data'] ?? null)) throw new RuntimeException(trim((string) ($decoded['message'] ?? 'Заявката за подобряване е отказана.')));
        return $decoded['data'];
    }
    private function token(Video $video, bool $aiAllowed = false): string
    {
        $header = $this->base64(json_encode(['alg' => 'HS256', 'typ' => 'AZM_ADMIN'], JSON_THROW_ON_ERROR));
        $payload = $this->base64(json_encode(['action' => 'enhancement', 'provider' => 'oneprovider', 'upload_id' => (string) $video->provider_video_id, 'user_id' => (int) $video->user_id, 'video_id' => (int) $video->id, 'ai_allowed' => $aiAllowed, 'exp' => time() + 300], JSON_THROW_ON_ERROR));
        return $header . '.' . $payload . '.' . $this->base64(hash_hmac('sha256', $header . '.' . $payload, $this->adminSecret, true));
    }
    private function base64(string $value): string { return rtrim(strtr(base64_encode($value), '+/', '-_'), '='); }
}
