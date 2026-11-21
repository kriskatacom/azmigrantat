import { cpus, freemem, loadavg } from 'node:os';
import { randomUUID } from 'node:crypto';
import { statfs } from 'node:fs/promises';
import type { VideoServiceConfig } from './config';
import { readAiReadiness } from './ai-readiness';
import { EnhancementStore } from './enhancement-store';
import { FfmpegProcessor } from './processing';
import type { JsonJobQueue } from './queue';
import { UploadStore } from './store';
import type { EnhancementFallbackPolicy, EnhancementJob, EnhancementMethod, EnhancementMode, EnhancementModeAvailability, EnhancementTargetShortSide, EnhancementTokenClaims, ProbeResult } from './types';

const MODES: EnhancementMode[] = ['fast_720p', 'fast_1080p', 'ai_720p', 'ai_1080p'];
const METHODS: EnhancementMethod[] = ['standard', 'ai'];
const TARGETS: EnhancementTargetShortSide[] = [720, 1080];
const FALLBACKS: EnhancementFallbackPolicy[] = ['none', 'allow_fast_720p', 'allow_fast'];
type CanonicalSelection = { mode: EnhancementMode; method: EnhancementMethod; target: EnhancementTargetShortSide };
type EnhancementOptions = { enabled: boolean; input: ProbeResult | null; modes: EnhancementModeAvailability[]; combinations: EnhancementModeAvailability[]; queue_depth: number; queue_depths: { standard: number; ai: number } };

export class EnhancementUnavailableError extends Error {
    constructor(message: string, readonly statusCode = 422, readonly code = 'enhancement_unavailable') { super(message); }
}

function selectionForMode(mode: EnhancementMode): CanonicalSelection {
    return mode === 'fast_720p' ? { mode, method: 'standard', target: 720 }
        : mode === 'fast_1080p' ? { mode, method: 'standard', target: 1080 }
            : mode === 'ai_720p' ? { mode, method: 'ai', target: 720 }
                : { mode, method: 'ai', target: 1080 };
}
function modeFor(method: EnhancementMethod, target: EnhancementTargetShortSide): EnhancementMode {
    if (method === 'standard') return target === 720 ? 'fast_720p' : 'fast_1080p';
    return target === 720 ? 'ai_720p' : 'ai_1080p';
}
function canonicalJob(job: EnhancementJob): EnhancementJob {
    const inferred = selectionForMode(job.mode); const requested = selectionForMode(job.requested_mode);
    return { ...job, method: job.method || inferred.method, target_short_side: job.target_short_side || inferred.target, requested_method: job.requested_method || requested.method, requested_target_short_side: job.requested_target_short_side || requested.target };
}

export class VideoEnhancementService {
    constructor(
        private readonly config: VideoServiceConfig,
        private readonly uploads: UploadStore,
        private readonly jobs: EnhancementStore,
        private readonly standardQueue: JsonJobQueue<EnhancementJob>,
        private readonly aiQueue: JsonJobQueue<EnhancementJob>,
        private readonly processor = new FfmpegProcessor(config, uploads),
    ) {}

    async options(claims: EnhancementTokenClaims): Promise<EnhancementOptions> {
        if (!this.config.enhancementEnabled) {
            const combinations = this.disabledModes('Подобряването временно не е активирано.');
            return { enabled: false, input: null, modes: this.legacyModes(combinations), combinations, queue_depth: 0, queue_depths: { standard: 0, ai: 0 } };
        }
        const state = await this.ownedUpload(claims);
        if (state.status !== 'ready' || !state.sourcePath) throw new EnhancementUnavailableError('Оригиналното видео все още не е готово.', 409, 'source_not_ready');
        this.uploads.assertOwnedPath(state.sourcePath);
        const input = await this.processor.probe(state.sourcePath);
        const [standardDepth, aiDepth, readiness] = await Promise.all([this.standardQueue.depth(), this.aiQueue.depth(), readAiReadiness(this.config).catch(() => null)]);
        const combinations = this.modeAvailability(input, { standard: standardDepth, ai: aiDepth }, claims.ai_allowed, readiness?.supported_target_short_sides || []);
        return { enabled: true, input, modes: this.legacyModes(combinations), combinations, queue_depth: standardDepth, queue_depths: { standard: standardDepth, ai: aiDepth } };
    }

    async create(claims: EnhancementTokenClaims, request: { mode?: unknown; method?: unknown; target_short_side?: unknown; target_height?: unknown; fallback_policy?: unknown; idempotency_key?: unknown }): Promise<EnhancementJob> {
        const requested = this.normalizeSelection(request);
        if (requested.method === 'ai' && !claims.ai_allowed) throw new EnhancementUnavailableError('AI режимът не е разрешен за този акаунт.', 403, 'ai_not_authorized');
        const fallbackPolicy = String(request.fallback_policy || 'none') as EnhancementFallbackPolicy;
        const idempotencyKey = String(request.idempotency_key || '').trim();
        if (!FALLBACKS.includes(fallbackPolicy)) throw new EnhancementUnavailableError('Невалидна fallback политика.');
        if (idempotencyKey.length < 8 || idempotencyKey.length > 180) throw new EnhancementUnavailableError('Невалиден idempotency key.');
        const optionSet = await this.options(claims);
        let selected = optionSet.combinations.find((item) => item.method === requested.method && item.target_short_side === requested.target);
        if (!selected?.available && fallbackPolicy !== 'none') {
            const allowed: EnhancementMode[] = fallbackPolicy === 'allow_fast_720p' ? ['fast_720p'] : ['fast_1080p', 'fast_720p'];
            selected = optionSet.modes.find((item) => allowed.includes(item.mode) && item.available);
        }
        if (!selected?.available || selected.estimated_seconds === null) throw new EnhancementUnavailableError(selected?.reason || 'Избраният режим не е наличен.');
        await this.assertCapacity(selected.method, optionSet.queue_depths[selected.method], optionSet.input!);
        const state = await this.ownedUpload(claims); const jobId = randomUUID();
        const scopedIdempotencyKey = `${claims.user_id}:${claims.video_id}:${idempotencyKey}`;
        const existingId = await this.jobs.reserveIdempotency(scopedIdempotencyKey, jobId);
        if (existingId) {
            const existing = await this.jobs.get(existingId);
            if (!existing || existing.user_id !== claims.user_id || existing.video_id !== claims.video_id) throw new EnhancementUnavailableError('Невалидна idempotent задача.', 409);
            const canonical = canonicalJob(existing);
            if (canonical.requested_method !== requested.method || canonical.requested_target_short_side !== requested.target || canonical.fallback_policy !== fallbackPolicy) throw new EnhancementUnavailableError('Idempotency key е използван с различни параметри.', 409, 'idempotency_conflict');
            return canonical;
        }
        const activeId = await this.jobs.reserveActive(claims.upload_id, jobId);
        if (activeId) { await this.jobs.releaseIdempotency(scopedIdempotencyKey, jobId); throw new EnhancementUnavailableError('За това видео вече има активна задача.', 409, 'duplicate_active_job'); }
        const now = Date.now();
        const job: EnhancementJob = {
            job_id: jobId, idempotency_key: idempotencyKey, upload_id: claims.upload_id, user_id: claims.user_id, video_id: claims.video_id,
            requested_mode: requested.mode, mode: selected.mode, requested_method: requested.method, method: selected.method,
            requested_target_short_side: requested.target, target_short_side: selected.target_short_side,
            fallback_policy: fallbackPolicy, status: 'pending', source_path: state.sourcePath!, created_at: new Date(now).toISOString(), queued_at: new Date(now).toISOString(),
            deadline_at: now + (selected.method === 'ai' ? this.config.enhancementAiMaxTotalSeconds : this.config.enhancementMaxTotalSeconds) * 1000, estimated_seconds: selected.estimated_seconds, progress: 0, input: optionSet.input!,
        };
        const queue = job.method === 'ai' ? this.aiQueue : this.standardQueue;
        try { await this.jobs.save(job); await queue.enqueue(job); }
        catch (error) { await this.jobs.releaseActive(claims.upload_id, jobId); await this.jobs.releaseIdempotency(scopedIdempotencyKey, jobId); throw error; }
        return job;
    }

    async getOwned(claims: EnhancementTokenClaims, jobId: string): Promise<EnhancementJob> {
        const job = await this.jobs.get(jobId);
        if (!job || job.upload_id !== claims.upload_id || job.video_id !== claims.video_id || job.user_id !== claims.user_id) throw new EnhancementUnavailableError('Задачата не е намерена.', 404, 'job_not_found');
        return canonicalJob(job);
    }
    async cancel(claims: EnhancementTokenClaims, jobId: string): Promise<EnhancementJob> {
        const job = await this.getOwned(claims, jobId);
        if (['completed', 'failed', 'cancelled', 'timeout'].includes(job.status)) return job;
        await this.jobs.requestCancel(job.job_id);
        const marked = await this.jobs.update(job.job_id, (current) => { if (['completed', 'failed', 'cancelled', 'timeout'].includes(current.status)) return null; current.cancel_requested = true; return current; });
        if (!marked) { await this.jobs.clearCancelRequest(job.job_id); return (await this.jobs.get(job.job_id)) || job; }
        if (marked.status === 'pending') {
            await (marked.method === 'ai' ? this.aiQueue : this.standardQueue).removeQueued((queued) => queued.job_id === marked.job_id);
            const cancelled = await this.jobs.update(marked.job_id, (current) => { if (current.status !== 'pending') return null; current.status = 'cancelled'; current.completed_at = new Date().toISOString(); current.failure_code = 'cancelled_by_user'; return current; });
            if (cancelled) { await this.jobs.releaseActive(cancelled.upload_id, cancelled.job_id); return cancelled; }
        }
        return (await this.jobs.get(job.job_id)) || marked;
    }
    response(job: EnhancementJob): Record<string, unknown> {
        const canonical = canonicalJob(job); const { source_path, output_path, idempotency_key, ...safe } = canonical;
        return { ...safe, result_url: canonical.playback_url || null };
    }

    private normalizeSelection(request: { mode?: unknown; method?: unknown; target_short_side?: unknown; target_height?: unknown }): CanonicalSelection {
        const rawMode = request.mode === undefined || request.mode === null ? '' : String(request.mode);
        const rawMethod = request.method === undefined || request.method === null ? '' : String(request.method);
        const rawTarget = request.target_short_side ?? request.target_height;
        let fromMode: CanonicalSelection | null = null; let fromCanonical: CanonicalSelection | null = null;
        if (rawMode) { if (!MODES.includes(rawMode as EnhancementMode)) throw new EnhancementUnavailableError('Невалиден режим за подобряване.'); fromMode = selectionForMode(rawMode as EnhancementMode); }
        if (rawMethod || rawTarget !== undefined) {
            if (!METHODS.includes(rawMethod as EnhancementMethod) || !TARGETS.includes(Number(rawTarget) as EnhancementTargetShortSide)) throw new EnhancementUnavailableError('Невалиден метод или резолюция.');
            const method = rawMethod as EnhancementMethod; const target = Number(rawTarget) as EnhancementTargetShortSide; fromCanonical = { method, target, mode: modeFor(method, target) };
        }
        if (!fromMode && !fromCanonical) throw new EnhancementUnavailableError('Изберете метод и резолюция.');
        if (fromMode && fromCanonical && (fromMode.method !== fromCanonical.method || fromMode.target !== fromCanonical.target)) throw new EnhancementUnavailableError('Параметрите за режим, метод и резолюция си противоречат.', 422, 'enhancement_selection_conflict');
        return fromCanonical || fromMode!;
    }
    private async ownedUpload(claims: EnhancementTokenClaims) {
        const state = await this.uploads.get(claims.upload_id);
        if (!state || state.userId !== claims.user_id || state.videoId !== claims.video_id || (state.provider || 'oneprovider') !== 'oneprovider') throw new EnhancementUnavailableError('Видеото не е намерено.', 404, 'source_not_found');
        return state;
    }
    private modeAvailability(input: ProbeResult, depths: { standard: number; ai: number }, aiAuthorized: boolean, aiReadyTargets: EnhancementTargetShortSide[]): EnhancementModeAvailability[] {
        const aiReason = !aiAuthorized ? 'AI режимът не е разрешен за този акаунт.' : !this.config.enhancementAiEnabled ? 'AI режимът е изключен за този сървър.' : this.config.enhancementAiEngine === 'disabled' || !this.config.enhancementAiCommand ? 'AI engine не е конфигуриран.' : aiReadyTargets.length === 0 ? 'AI worker няма потвърдена готовност.' : undefined;
        return [
            this.availability('standard', 720, '720p — стандартно подобряване', this.config.enhancementFast720Fps, this.config.enhancementMax720Duration, input, depths.standard),
            this.availability('standard', 1080, '1080p — стандартно подобряване', this.config.enhancementFast1080Fps, this.config.enhancementMax1080Duration, input, depths.standard),
            this.availability('ai', 720, '720p — AI подобряване', this.config.enhancementAi720Fps, this.config.enhancementMaxAi720Duration, input, depths.ai, aiReason || (!aiReadyTargets.includes(720) ? 'AI worker не поддържа 720p.' : undefined)),
            this.availability('ai', 1080, '1080p — AI подобряване', this.config.enhancementAi1080Fps, this.config.enhancementMaxAi1080Duration, input, depths.ai, aiReason || (!aiReadyTargets.includes(1080) ? 'AI worker не поддържа 1080p.' : undefined)),
        ];
    }
    private availability(method: EnhancementMethod, target: EnhancementTargetShortSide, label: string, benchmarkFps: number, maxDuration: number, input: ProbeResult, queueDepth: number, disabledReason?: string): EnhancementModeAvailability {
        let reason = disabledReason; const inputShortSide = Math.min(input.width, input.height); const fps = input.fps && input.fps > 0 ? input.fps : 30; const frames = input.frameCount && input.frameCount > 0 ? input.frameCount : input.duration * fps; const estimated = Math.ceil(frames / benchmarkFps + this.config.enhancementFinalizeReserveSeconds); const maxDepth = method === 'ai' ? this.config.enhancementAiMaxQueueDepth : this.config.enhancementMaxQueueDepth;
        if (!reason && inputShortSide >= target) reason = `Видеото вече е поне ${target}p по късата страна.`;
        else if (!reason && (input.duration <= 0 || input.duration > maxDuration)) reason = `Максималната дължина за режима е ${maxDuration} секунди.`;
        else if (!reason && estimated + queueDepth * estimated > (method === 'ai' ? this.config.enhancementAiMaxTotalSeconds : this.config.enhancementMaxTotalSeconds)) reason = `Прогнозата надхвърля лимита от ${Math.ceil((method === 'ai' ? this.config.enhancementAiMaxTotalSeconds : this.config.enhancementMaxTotalSeconds) / 60)} минути.`;
        else if (!reason && queueDepth >= maxDepth) reason = 'Сървърът временно е зает. Опитайте отново по-късно.';
        const mode = modeFor(method, target);
        return { mode, label, method, target_short_side: target, target_height: target, available: reason === undefined, estimated_seconds: reason === undefined ? estimated : null, max_duration_seconds: maxDuration, ...(reason ? { reason } : {}) };
    }
    private disabledModes(reason: string): EnhancementModeAvailability[] {
        return [
            { mode: 'fast_720p', label: '720p — стандартно подобряване', method: 'standard', target_short_side: 720, target_height: 720, available: false, estimated_seconds: null, max_duration_seconds: this.config.enhancementMax720Duration, reason },
            { mode: 'fast_1080p', label: '1080p — стандартно подобряване', method: 'standard', target_short_side: 1080, target_height: 1080, available: false, estimated_seconds: null, max_duration_seconds: this.config.enhancementMax1080Duration, reason },
            { mode: 'ai_720p', label: '720p — AI подобряване', method: 'ai', target_short_side: 720, target_height: 720, available: false, estimated_seconds: null, max_duration_seconds: this.config.enhancementMaxAi720Duration, reason },
            { mode: 'ai_1080p', label: '1080p — AI подобряване', method: 'ai', target_short_side: 1080, target_height: 1080, available: false, estimated_seconds: null, max_duration_seconds: this.config.enhancementMaxAi1080Duration, reason },
        ];
    }
    private legacyModes(combinations: EnhancementModeAvailability[]): EnhancementModeAvailability[] {
        return combinations.filter((item) => item.mode !== 'ai_720p');
    }
    private async assertCapacity(method: EnhancementMethod, queueDepth: number, input: ProbeResult): Promise<void> {
        const maxDepth = method === 'ai' ? this.config.enhancementAiMaxQueueDepth : this.config.enhancementMaxQueueDepth;
        if (queueDepth >= maxDepth) throw new EnhancementUnavailableError('Видео сървърът временно е зает.', 503, 'capacity_busy');
        const maxLoad = method === 'ai' ? this.config.enhancementAiMaxLoadPerCpu : this.config.enhancementMaxLoadPerCpu;
        if (loadavg()[0] / Math.max(1, cpus().length) > maxLoad) throw new EnhancementUnavailableError('Видео сървърът е натоварен. Опитайте отново по-късно.', 503, 'cpu_busy');
        const minMemory = method === 'ai' ? this.config.enhancementAiMinAvailableMemoryBytes : this.config.enhancementMinAvailableMemoryBytes;
        if (freemem() < minMemory) throw new EnhancementUnavailableError('Няма достатъчно свободна памет за безопасна обработка.', 503, 'memory_busy');
        if (method === 'ai' && input.width * input.height > this.config.enhancementAiMaxInputPixels) throw new EnhancementUnavailableError('Входното видео е твърде голямо за безопасна AI обработка.', 422, 'ai_input_too_large');
        const disk = await statfs(this.config.root); if (disk.bavail * disk.bsize < this.config.minFreeBytes) throw new EnhancementUnavailableError('Няма достатъчно свободно дисково пространство.', 503, 'disk_busy');
    }
}
