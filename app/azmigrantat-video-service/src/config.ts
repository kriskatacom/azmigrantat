import { resolve } from 'node:path';

function positiveInteger(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
    const value = Number(env[name] ?? fallback);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid positive integer for ${name}.`);
    return value;
}

function allowedMimeTypes(env: NodeJS.ProcessEnv): Set<string> {
    const types = (env.VIDEO_SERVICE_ALLOWED_MIME_TYPES ?? 'video/mp4,video/quicktime,video/webm,video/x-m4v')
        .split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (types.length === 0) throw new Error('At least one allowed video MIME type is required.');
    return new Set(types);
}

export type VideoServiceConfig = {
    host: string; port: number; root: string; tokenSecret: string; adminTokenSecret: string;
    maxUploadBytes: number; maxChunkBytes: number; tokenTtlSeconds: number;
    allowedMimeTypes: Set<string>; redisUrl: string; queueKey: string;
    callbackUrl: string; callbackSecret: string; publicUrl: string;
    workerConcurrency: number; minFreeBytes: number; maxRetries: number;
    leaseSeconds: number; retentionSeconds: number; processTimeoutSeconds: number;
    ffprobeBin: string; ffmpegBin: string;
    enhancementEnabled: boolean; enhancementAiEnabled: boolean;
    enhancementQueueKey: string; enhancementAiQueueKey: string; enhancementAiReadinessKey: string;
    enhancementAiReadinessTtlSeconds: number; enhancementMaxTotalSeconds: number; enhancementAiMaxTotalSeconds: number;
    enhancementFinalizeReserveSeconds: number; enhancementConcurrency: number;
    enhancementFast720Fps: number; enhancementFast1080Fps: number; enhancementAi720Fps: number; enhancementAi1080Fps: number;
    enhancementMax720Duration: number; enhancementMax1080Duration: number; enhancementMaxAi720Duration: number; enhancementMaxAi1080Duration: number;
    enhancementMaxLoadPerCpu: number; enhancementMinAvailableMemoryBytes: number;
    enhancementMaxQueueDepth: number; enhancementFfmpegThreads: number;
    enhancementAiMaxQueueDepth: number; enhancementAiMaxLoadPerCpu: number;
    enhancementAiMinAvailableMemoryBytes: number; enhancementAiMaxInputPixels: number;
    enhancementAiMaxWorkspaceBytes: number;
    enhancementAiLeaseSeconds: number; enhancementAiMaxAttempts: number; enhancementAiPreemptCheckMs: number;
    enhancementAiEngine: string; enhancementAiCommand: string; enhancementAiModelFingerprint: string; enhancementAiAdapterFingerprint: string;
};

function booleanValue(env: NodeJS.ProcessEnv, name: string, fallback = false): boolean {
    const value = (env[name] ?? (fallback ? '1' : '0')).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(value)) return true;
    if (['0', 'false', 'no', 'off'].includes(value)) return false;
    throw new Error(`Invalid boolean for ${name}.`);
}

function positiveNumber(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
    const value = Number(env[name] ?? fallback);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid positive number for ${name}.`);
    return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): VideoServiceConfig {
    const tokenSecret = env.VIDEO_SERVICE_TOKEN_SECRET?.trim();
    if (!tokenSecret || tokenSecret === 'replace-with-a-long-random-secret') throw new Error('VIDEO_SERVICE_TOKEN_SECRET must be configured.');
    const adminTokenSecret = env.VIDEO_SERVICE_ADMIN_SECRET?.trim();
    if (!adminTokenSecret || adminTokenSecret === 'replace-with-a-long-random-secret') throw new Error('VIDEO_SERVICE_ADMIN_SECRET must be configured.');
    return {
        host: env.VIDEO_SERVICE_HOST?.trim() || '127.0.0.1',
        port: positiveInteger(env, 'VIDEO_SERVICE_PORT', 3100),
        root: resolve(env.VIDEO_SERVICE_ROOT?.trim() || './storage/video'),
        tokenSecret, adminTokenSecret,
        maxUploadBytes: positiveInteger(env, 'VIDEO_SERVICE_MAX_UPLOAD_BYTES', 2 * 1024 ** 3),
        maxChunkBytes: positiveInteger(env, 'VIDEO_SERVICE_MAX_CHUNK_BYTES', 8 * 1024 ** 2),
        tokenTtlSeconds: positiveInteger(env, 'VIDEO_SERVICE_TOKEN_TTL_SECONDS', 900),
        allowedMimeTypes: allowedMimeTypes(env),
        redisUrl: env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379',
        queueKey: env.VIDEO_SERVICE_QUEUE_KEY?.trim() || 'azmigrantat:video:processing',
        callbackUrl: env.VIDEO_SERVICE_CALLBACK_URL?.trim() || '',
        callbackSecret: env.VIDEO_SERVICE_CALLBACK_SECRET?.trim() || '',
        publicUrl: env.VIDEO_SERVICE_PUBLIC_URL?.trim().replace(/\/+$/, '') || '',
        workerConcurrency: positiveInteger(env, 'VIDEO_WORKER_CONCURRENCY', 1),
        minFreeBytes: positiveInteger(env, 'VIDEO_PROCESSING_MIN_FREE_BYTES', 10 * 1024 ** 3),
        maxRetries: positiveInteger(env, 'VIDEO_PROCESSING_MAX_RETRIES', 3),
        leaseSeconds: positiveInteger(env, 'VIDEO_PROCESSING_LEASE_SECONDS', 900),
        retentionSeconds: positiveInteger(env, 'VIDEO_PROCESSING_RETENTION_SECONDS', 24 * 3600),
        processTimeoutSeconds: positiveInteger(env, 'VIDEO_PROCESSING_TIMEOUT_SECONDS', 15 * 60),
        ffprobeBin: env.FFPROBE_BIN?.trim() || 'ffprobe',
        ffmpegBin: env.FFMPEG_BIN?.trim() || 'ffmpeg',
        enhancementEnabled: booleanValue(env, 'VIDEO_ENHANCEMENT_ENABLED', false),
        enhancementAiEnabled: booleanValue(env, 'VIDEO_ENHANCEMENT_AI_ENABLED', false),
        enhancementQueueKey: env.VIDEO_ENHANCEMENT_QUEUE_KEY?.trim() || 'azmigrantat:video:enhancement',
        enhancementAiQueueKey: env.VIDEO_ENHANCEMENT_AI_QUEUE_KEY?.trim() || 'azmigrantat:video:enhancement:ai',
        enhancementAiReadinessKey: env.VIDEO_ENHANCEMENT_AI_READINESS_KEY?.trim() || 'azmigrantat:video:enhancement:ai:readiness',
        enhancementAiReadinessTtlSeconds: positiveInteger(env, 'VIDEO_ENHANCEMENT_AI_READINESS_TTL_SECONDS', 45),
        enhancementMaxTotalSeconds: Math.min(300, positiveInteger(env, 'VIDEO_ENHANCEMENT_MAX_TOTAL_SECONDS', 300)),
        enhancementAiMaxTotalSeconds: Math.min(4 * 3600, positiveInteger(env, 'VIDEO_ENHANCEMENT_AI_MAX_TOTAL_SECONDS', 2 * 3600)),
        enhancementFinalizeReserveSeconds: positiveInteger(env, 'VIDEO_ENHANCEMENT_FINALIZE_RESERVE_SECONDS', 20),
        enhancementConcurrency: positiveInteger(env, 'VIDEO_ENHANCEMENT_CONCURRENCY', 1),
        enhancementFast720Fps: positiveNumber(env, 'VIDEO_ENHANCEMENT_FAST_720_FPS', 70),
        enhancementFast1080Fps: positiveNumber(env, 'VIDEO_ENHANCEMENT_FAST_1080_FPS', 35),
        enhancementAi720Fps: positiveNumber(env, 'VIDEO_ENHANCEMENT_AI_720_FPS', 0.2),
        enhancementAi1080Fps: positiveNumber(env, 'VIDEO_ENHANCEMENT_AI_1080_FPS', 0.1),
        enhancementMax720Duration: positiveInteger(env, 'VIDEO_ENHANCEMENT_MAX_720_DURATION_SECONDS', 240),
        enhancementMax1080Duration: positiveInteger(env, 'VIDEO_ENHANCEMENT_MAX_1080_DURATION_SECONDS', 120),
        enhancementMaxAi720Duration: positiveInteger(env, 'VIDEO_ENHANCEMENT_MAX_AI_720_DURATION_SECONDS', Number(env.VIDEO_ENHANCEMENT_MAX_AI_DURATION_SECONDS || 5)),
        enhancementMaxAi1080Duration: positiveInteger(env, 'VIDEO_ENHANCEMENT_MAX_AI_1080_DURATION_SECONDS', Number(env.VIDEO_ENHANCEMENT_MAX_AI_DURATION_SECONDS || 5)),
        enhancementMaxLoadPerCpu: positiveNumber(env, 'VIDEO_ENHANCEMENT_MAX_LOAD_PER_CPU', 0.7),
        enhancementMinAvailableMemoryBytes: positiveInteger(env, 'VIDEO_ENHANCEMENT_MIN_AVAILABLE_MEMORY_BYTES', 4 * 1024 ** 3),
        enhancementMaxQueueDepth: positiveInteger(env, 'VIDEO_ENHANCEMENT_MAX_QUEUE_DEPTH', 1),
        enhancementFfmpegThreads: positiveInteger(env, 'VIDEO_ENHANCEMENT_FFMPEG_THREADS', 6),
        enhancementAiMaxQueueDepth: positiveInteger(env, 'VIDEO_ENHANCEMENT_AI_MAX_QUEUE_DEPTH', 1),
        enhancementAiMaxLoadPerCpu: positiveNumber(env, 'VIDEO_ENHANCEMENT_AI_MAX_LOAD_PER_CPU', 0.35),
        enhancementAiMinAvailableMemoryBytes: positiveInteger(env, 'VIDEO_ENHANCEMENT_AI_MIN_AVAILABLE_MEMORY_BYTES', 16 * 1024 ** 3),
        enhancementAiMaxInputPixels: positiveInteger(env, 'VIDEO_ENHANCEMENT_AI_MAX_INPUT_PIXELS', 1920 * 1080),
        enhancementAiMaxWorkspaceBytes: positiveInteger(env, 'VIDEO_ENHANCEMENT_AI_MAX_WORKSPACE_BYTES', 8 * 1024 ** 3),
        enhancementAiLeaseSeconds: Math.min(300, positiveInteger(env, 'VIDEO_ENHANCEMENT_AI_LEASE_SECONDS', 120)),
        enhancementAiMaxAttempts: Math.min(3, positiveInteger(env, 'VIDEO_ENHANCEMENT_AI_MAX_ATTEMPTS', 2)),
        enhancementAiPreemptCheckMs: Math.max(500, Math.min(10_000, positiveInteger(env, 'VIDEO_ENHANCEMENT_AI_PREEMPT_CHECK_MS', 1000))),
        enhancementAiEngine: env.VIDEO_ENHANCEMENT_AI_ENGINE?.trim() || 'disabled',
        enhancementAiCommand: env.VIDEO_ENHANCEMENT_AI_COMMAND?.trim() || '',
        enhancementAiModelFingerprint: env.VIDEO_ENHANCEMENT_AI_MODEL_FINGERPRINT?.trim() || '',
        enhancementAiAdapterFingerprint: env.VIDEO_ENHANCEMENT_AI_ADAPTER_FINGERPRINT?.trim() || '',
    };
}
