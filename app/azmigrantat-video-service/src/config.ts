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
};

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
    };
}
