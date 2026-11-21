<?php

namespace App\Services;

use App\Models\VideoEnhancementJob;
use Carbon\Carbon;
use RuntimeException;

final class VideoEnhancementCallbackService
{
    private const STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'timeout'];
    public function __construct(private readonly DedicatedVideoProvider $provider = new DedicatedVideoProvider()) {}
    public function handle(string $rawBody, ?string $signature, ?string $timestamp): array
    {
        if (!$this->provider->verifySignedCallback($rawBody, $signature, $timestamp)) throw new RuntimeException('Невалиден enhancement callback подпис.');
        $payload = json_decode($rawBody, true);
        if (!is_array($payload) || ($payload['event_type'] ?? '') !== 'video_enhancement') throw new RuntimeException('Невалиден enhancement callback JSON.');
        $jobId = trim((string) ($payload['job_id'] ?? '')); $status = strtolower(trim((string) ($payload['status'] ?? '')));
        $videoId = (int) ($payload['video_id'] ?? 0); $userId = (int) ($payload['user_id'] ?? 0); $uploadId = trim((string) ($payload['upload_id'] ?? ''));
        if (!preg_match('/^[a-f0-9-]{36}$/i', $jobId) || !in_array($status, self::STATUSES, true) || $videoId < 1 || $userId < 1 || $uploadId === '') throw new RuntimeException('Невалидни enhancement callback данни.');
        $job = VideoEnhancementJob::query()->where('job_id', $jobId)->where('video_id', $videoId)->where('user_id', $userId)->where('upload_id', $uploadId)->first();
        if (!$job) throw new RuntimeException('Enhancement callback ownership mismatch.');
        $wasTerminal = in_array($job->status, ['completed', 'failed', 'cancelled', 'timeout'], true);
        if ($wasTerminal) return ['duplicate' => true, 'status' => (string) $job->status, 'job' => $job];
        if ($status === 'completed' && trim((string) ($payload['result_url'] ?? '')) === '') throw new RuntimeException('Completed enhancement callback must include result URL.');
        $job->status = $status; $job->progress = max(0, min(100, (int) ($payload['progress'] ?? $job->progress)));
        $job->mode = trim((string) ($payload['mode'] ?? $job->mode));
        $job->method = trim((string) ($payload['method'] ?? $job->method));
        $job->target_short_side = (int) ($payload['target_short_side'] ?? $job->target_short_side);
        $job->result_url = trim((string) ($payload['result_url'] ?? '')) ?: null;
        $job->failure_code = trim((string) ($payload['failure_code'] ?? '')) ?: null;
        $job->failure_reason = trim((string) ($payload['failure_reason'] ?? '')) ?: null;
        if ($status === 'processing') $job->started_at = $job->started_at ?: Carbon::now();
        if (in_array($status, ['completed', 'failed', 'cancelled', 'timeout'], true)) $job->completed_at = Carbon::now();
        $job->save();
        return ['duplicate' => false, 'status' => $status, 'job' => $job->refresh()];
    }
}
