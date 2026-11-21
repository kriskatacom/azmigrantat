<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\Video;
use App\Models\VideoEnhancementJob;
use App\Services\VideoEnhancementService;
use RuntimeException;

final class VideoEnhancementController extends BaseController
{
    public function options($id)
    {
        [$user, $video, $error] = $this->context((int) $id);
        if ($error) return $error;
        $service = new VideoEnhancementService();
        if (!$service->isEnabledFor($user)) return $this->json(['success' => true, 'data' => ['enabled' => false, 'input' => null, 'modes' => [], 'queue_depth' => 0]]);
        try {
            $data = $service->options($video, $service->isAiEnabledFor($user));
            $latest = VideoEnhancementJob::query()->where('video_id', (int) $video->id)->where('user_id', (int) $user->id)->orderByDesc('id')->first();
            $data['latest_job'] = $latest ? $this->serialize($latest) : null;
            return $this->json(['success' => true, 'data' => $data]);
        }
        catch (RuntimeException $exception) { return $this->failure($exception); }
    }

    public function store($id)
    {
        [$user, $video, $error] = $this->context((int) $id);
        if ($error) return $error;
        $service = new VideoEnhancementService();
        if (!$service->isEnabledFor($user)) return $this->json(['success' => false, 'message' => 'Функцията не е активирана за този акаунт.'], 403);
        $input = $this->jsonInput();
        $selection = $this->normalizeSelection($input);
        $fallback = trim((string) ($input['fallback_policy'] ?? 'none'));
        $idempotencyKey = trim((string) ($input['idempotency_key'] ?? ($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '')));
        if (!$selection || !in_array($fallback, ['none', 'allow_fast_720p', 'allow_fast'], true) || strlen($idempotencyKey) < 8 || strlen($idempotencyKey) > 180) return $this->json(['success' => false, 'message' => 'Невалидни или противоречиви параметри за подобряване.'], 422);
        $aiAllowed = $service->isAiEnabledFor($user);
        if ($selection['method'] === 'ai' && !$aiAllowed) return $this->json(['success' => false, 'message' => 'AI режимът не е разрешен за този акаунт.'], 403);
        try {
            $remote = $service->start($video, ['mode' => $selection['mode'], 'method' => $selection['method'], 'target_short_side' => $selection['target_short_side'], 'fallback_policy' => $fallback, 'idempotency_key' => $idempotencyKey], $aiAllowed);
            $job = $this->sync($video, $remote);
            return $this->json(['success' => true, 'data' => $this->serialize($job)], 202);
        } catch (RuntimeException $exception) { return $this->failure($exception); }
    }

    public function show($id, $jobId)
    {
        [, $video, $error] = $this->context((int) $id);
        if ($error) return $error;
        $job = VideoEnhancementJob::query()->where('job_id', (string) $jobId)->where('video_id', (int) $video->id)->where('user_id', (int) $video->user_id)->first();
        if (!$job) return $this->json(['success' => false, 'message' => 'Задачата не е намерена.'], 404);
        try { $job = $this->sync($video, (new VideoEnhancementService())->status($video, (string) $jobId)); }
        catch (RuntimeException $exception) { error_log('[VideoEnhancement] status fallback: ' . $exception->getMessage()); }
        return $this->json(['success' => true, 'data' => $this->serialize($job)]);
    }

    public function cancel($id, $jobId)
    {
        [, $video, $error] = $this->context((int) $id);
        if ($error) return $error;
        $job = VideoEnhancementJob::query()->where('job_id', (string) $jobId)->where('video_id', (int) $video->id)->where('user_id', (int) $video->user_id)->first();
        if (!$job) return $this->json(['success' => false, 'message' => 'Задачата не е намерена.'], 404);
        try { $job = $this->sync($video, (new VideoEnhancementService())->cancel($video, (string) $jobId)); return $this->json(['success' => true, 'data' => $this->serialize($job)]); }
        catch (RuntimeException $exception) { return $this->failure($exception); }
    }

    public function select($id, $jobId)
    {
        [, $video, $error] = $this->context((int) $id);
        if ($error) return $error;
        $job = VideoEnhancementJob::query()->where('job_id', (string) $jobId)->where('video_id', (int) $video->id)->where('user_id', (int) $video->user_id)->first();
        if (!$job || $job->status !== 'completed' || !$job->result_url) return $this->json(['success' => false, 'message' => 'Подобрената версия още не е готова.'], 409);
        $input = $this->jsonInput(); $version = (string) ($input['version'] ?? '');
        if (!in_array($version, ['original', 'enhanced'], true)) return $this->json(['success' => false, 'message' => 'Изберете оригинална или подобрена версия.'], 422);
        $target = $version === 'enhanced' ? (string) $job->result_url : (string) $job->original_playback_url;
        if ($target === '') return $this->json(['success' => false, 'message' => 'Оригиналната версия не е налична.'], 409);
        $video->playback_url = $target; $video->save();
        return $this->json(['success' => true, 'data' => ['selected_version' => $version, 'playback_url' => $target]]);
    }

    private function context(int $videoId): array
    {
        $user = $this->authenticatedUser();
        if (!$user) return [null, null, $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401)];
        $video = Video::query()->whereKey($videoId)->where('user_id', (int) $user->id)->where('provider', 'oneprovider')->first();
        if (!$video) return [$user, null, $this->json(['success' => false, 'message' => 'Видеото не е намерено или не поддържа подобряване.'], 404)];
        if ($video->status !== Video::STATUS_READY) return [$user, $video, $this->json(['success' => false, 'message' => 'Видеото още не е готово.'], 409)];
        return [$user, $video, null];
    }

    private function sync(Video $video, array $data): VideoEnhancementJob
    {
        $jobId = trim((string) ($data['job_id'] ?? ''));
        if (!preg_match('/^[a-f0-9-]{36}$/i', $jobId)) throw new RuntimeException('Видео услугата върна невалидна задача.');
        $existing = VideoEnhancementJob::query()->where('job_id', $jobId)->first();
        return VideoEnhancementJob::query()->updateOrCreate(['job_id' => $jobId], [
            'video_id' => (int) $video->id, 'user_id' => (int) $video->user_id, 'upload_id' => (string) $video->provider_video_id,
            'requested_mode' => (string) ($data['requested_mode'] ?? $data['mode'] ?? ''), 'mode' => (string) ($data['mode'] ?? ''),
            'requested_method' => (string) ($data['requested_method'] ?? (str_starts_with((string) ($data['requested_mode'] ?? ''), 'ai_') ? 'ai' : 'standard')),
            'method' => (string) ($data['method'] ?? (str_starts_with((string) ($data['mode'] ?? ''), 'ai_') ? 'ai' : 'standard')),
            'requested_target_short_side' => (int) ($data['requested_target_short_side'] ?? (str_ends_with((string) ($data['requested_mode'] ?? ''), '720p') ? 720 : 1080)),
            'target_short_side' => (int) ($data['target_short_side'] ?? (str_ends_with((string) ($data['mode'] ?? ''), '720p') ? 720 : 1080)),
            'fallback_policy' => (string) ($data['fallback_policy'] ?? 'none'), 'status' => (string) ($data['status'] ?? 'pending'),
            'progress' => max(0, min(100, (int) ($data['progress'] ?? 0))), 'estimated_seconds' => isset($data['estimated_seconds']) ? max(0, (int) $data['estimated_seconds']) : null,
            'result_url' => trim((string) ($data['result_url'] ?? '')) ?: null, 'original_playback_url' => trim((string) ($existing?->original_playback_url ?: $video->playback_url)) ?: null, 'failure_code' => trim((string) ($data['failure_code'] ?? '')) ?: null,
            'failure_reason' => trim((string) ($data['failure_reason'] ?? '')) ?: null, 'started_at' => $data['started_at'] ?? null, 'completed_at' => $data['completed_at'] ?? null,
        ]);
    }
    private function serialize(VideoEnhancementJob $job): array { return ['job_id' => $job->job_id, 'video_id' => (int) $job->video_id, 'requested_mode' => $job->requested_mode, 'mode' => $job->mode, 'requested_method' => $job->requested_method, 'method' => $job->method, 'requested_target_short_side' => (int) $job->requested_target_short_side, 'target_short_side' => (int) $job->target_short_side, 'fallback_policy' => $job->fallback_policy, 'status' => $job->status, 'progress' => (int) $job->progress, 'estimated_seconds' => $job->estimated_seconds !== null ? (int) $job->estimated_seconds : null, 'original_url' => $job->original_playback_url, 'result_url' => $job->result_url, 'failure_code' => $job->failure_code, 'failure_reason' => $job->failure_reason, 'started_at' => $job->started_at?->toIso8601String(), 'completed_at' => $job->completed_at?->toIso8601String()]; }
    private function normalizeSelection(array $input): ?array
    {
        $mapping = ['fast_720p' => ['standard', 720], 'fast_1080p' => ['standard', 1080], 'ai_720p' => ['ai', 720], 'ai_1080p' => ['ai', 1080]];
        $mode = trim((string) ($input['mode'] ?? '')); $fromMode = $mode !== '' ? ($mapping[$mode] ?? null) : null;
        if ($mode !== '' && !$fromMode) return null;
        $hasCanonical = array_key_exists('method', $input) || array_key_exists('target_short_side', $input) || array_key_exists('target_height', $input);
        $fromCanonical = null;
        if ($hasCanonical) {
            $method = trim((string) ($input['method'] ?? '')); $target = (int) ($input['target_short_side'] ?? $input['target_height'] ?? 0);
            if (!in_array($method, ['standard', 'ai'], true) || !in_array($target, [720, 1080], true)) return null;
            $fromCanonical = [$method, $target];
        }
        if (!$fromMode && !$fromCanonical) return null;
        if ($fromMode && $fromCanonical && $fromMode !== $fromCanonical) return null;
        [$method, $target] = $fromCanonical ?: $fromMode;
        return ['method' => $method, 'target_short_side' => $target, 'mode' => $method === 'standard' ? ($target === 720 ? 'fast_720p' : 'fast_1080p') : ($target === 720 ? 'ai_720p' : 'ai_1080p')];
    }
    private function jsonInput(): array { $value = json_decode(file_get_contents('php://input') ?: '{}', true); return is_array($value) ? $value : []; }
    private function failure(RuntimeException $exception) { error_log('[VideoEnhancement] ' . $exception->getMessage()); return $this->json(['success' => false, 'message' => $exception->getMessage()], str_contains($exception->getMessage(), 'зает') || str_contains($exception->getMessage(), 'натоварен') ? 503 : 422); }
}
