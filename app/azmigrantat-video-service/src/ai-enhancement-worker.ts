import { spawn } from 'node:child_process';
import { rename, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import type { VideoServiceConfig } from './config';
import { clearAiReadiness, newAiWorkerId, preflightAiAdapter, publishAiReadiness } from './ai-readiness';
import { StatusCallbackOutbox } from './callbacks';
import { EnhancementStore } from './enhancement-store';
import { FencedRedisJsonQueue, RedisJsonQueue, type FencedQueueLease } from './queue';
import { UploadStore } from './store';
import { FfmpegProcessor } from './processing';
import type { EnhancementJob, ProbeResult } from './types';

class AiAbortError extends Error {
    constructor(message: string, readonly code: 'cancelled' | 'timeout' | 'preempted') { super(message); }
}
class LostLeaseError extends Error {}

export class AiEnhancementWorker {
    private running = false;
    private adapterReady = false;
    private readinessRefreshRunning = false;
    private recoveryRunning = false;
    private readonly workerId = newAiWorkerId();
    private readonly processor: FfmpegProcessor;
    private readonly callbacks: StatusCallbackOutbox;
    private readonly protectedQueues: Array<RedisJsonQueue<unknown>>;
    private activeTerminate?: (error: Error) => void;

    constructor(
        private readonly config: VideoServiceConfig,
        private readonly uploads: UploadStore,
        private readonly jobs: EnhancementStore,
        private readonly queue: FencedRedisJsonQueue<EnhancementJob>,
    ) {
        this.processor = new FfmpegProcessor(config, uploads);
        this.callbacks = new StatusCallbackOutbox(config);
        this.protectedQueues = [new RedisJsonQueue<unknown>(config.redisUrl, config.queueKey), new RedisJsonQueue<unknown>(config.redisUrl, config.enhancementQueueKey)];
    }

    async start(): Promise<void> {
        if (this.running) return;
        this.running = true;
        await this.queue.assertLegacyProcessingEmpty();
        await this.refreshReadiness();
        if (!this.adapterReady) throw new Error('AI worker preflight failed; queue consumption was not started.');
        await this.recoverExpiredLeases();
        const refreshTimer = setInterval(() => { void this.refreshReadiness(); }, Math.max(5_000, Math.floor(this.config.enhancementAiReadinessTtlSeconds * 500)));
        const recoveryTimer = setInterval(() => { void this.recoverExpiredLeases(); }, Math.max(5_000, Math.floor(this.config.enhancementAiLeaseSeconds * 500)));
        try {
            while (this.running) {
                if (!this.adapterReady || await this.productionBusy()) { await this.delay(1_000); continue; }
                const lease = await this.queue.claim(this.workerId, this.config.enhancementAiLeaseSeconds);
                if (!lease) { await this.delay(500); continue; }
                await this.process(lease);
            }
        } finally {
            clearInterval(refreshTimer); clearInterval(recoveryTimer);
            await clearAiReadiness(this.config).catch(() => undefined);
        }
    }

    stop(): void { this.running = false; this.adapterReady = false; this.activeTerminate?.(new AiAbortError('AI worker is stopping.', 'preempted')); void clearAiReadiness(this.config).catch(() => undefined); }

    private async refreshReadiness(): Promise<void> {
        if (this.readinessRefreshRunning || await this.productionBusy()) return;
        this.readinessRefreshRunning = true;
        try { const preflight = await preflightAiAdapter(this.config); await publishAiReadiness(this.config, preflight, this.workerId); this.adapterReady = true; }
        catch (error) { this.adapterReady = false; await clearAiReadiness(this.config).catch(() => undefined); console.error(JSON.stringify({ event: 'ai_worker_not_ready', reason: this.message(error) })); }
        finally { this.readinessRefreshRunning = false; }
    }

    private async recoverExpiredLeases(): Promise<void> {
        if (this.recoveryRunning) return;
        this.recoveryRunning = true;
        try {
            const recovered = await this.queue.recoverExpired(this.config.enhancementAiMaxAttempts);
            for (const queued of recovered.requeued) {
                const reset = await this.jobs.updateIfExecutionToken(queued.job.job_id, queued.leaseToken, (job) => {
                    if (this.terminal(job)) return null;
                    job.status = 'pending'; job.progress = 0; delete job.execution_token; delete job.execution_attempt; return job;
                });
                const current = reset || await this.jobs.get(queued.job.job_id);
                await this.jobs.cleanupAiAttempt(queued.job.job_id, queued.leaseToken).catch(() => undefined);
                if (this.completedByAttempt(current, queued.leaseToken)) await this.finalizeRecoveredCompletion(current!);
                else await this.jobs.discardAttemptPublish(queued.job, queued.leaseToken).catch(() => undefined);
            }
            for (const exhausted of recovered.exhausted) {
                const failed = await this.failExhausted(exhausted.job, exhausted.leaseToken);
                const current = failed || await this.jobs.get(exhausted.job.job_id);
                await this.jobs.cleanupAiAttempt(exhausted.job.job_id, exhausted.leaseToken).catch(() => undefined);
                if (this.completedByAttempt(current, exhausted.leaseToken)) await this.finalizeRecoveredCompletion(current!);
                else await this.jobs.discardAttemptPublish(exhausted.job, exhausted.leaseToken).catch(() => undefined);
            }
        } finally { this.recoveryRunning = false; }
    }

    private async failExhausted(stale: EnhancementJob, token: string): Promise<EnhancementJob | null> {
        const job = await this.jobs.updateIfExecutionToken(stale.job_id, token, (current) => {
            if (this.terminal(current)) return null;
            current.status = Date.now() >= current.deadline_at ? 'timeout' : 'failed'; current.failure_code = 'ai_lease_exhausted'; current.failure_reason = 'AI задачата не можа да бъде възстановена безопасно след прекъсване.'; current.completed_at = new Date().toISOString();
            delete current.execution_token; delete current.execution_attempt; return current;
        });
        if (job) { await this.jobs.releaseActive(job.upload_id, job.job_id); await this.jobs.clearCancelRequest(job.job_id); await this.notify(job); }
        return job;
    }

    private completedByAttempt(job: EnhancementJob | null, token: string): boolean {
        return job?.status === 'completed' && basename(job.output_path || '') === `${job.job_id}-${token}.mp4`;
    }

    private async finalizeRecoveredCompletion(job: EnhancementJob): Promise<void> {
        await this.queue.removeQueued((queued) => queued.job_id === job.job_id);
        await this.jobs.releaseActive(job.upload_id, job.job_id);
        await this.jobs.clearCancelRequest(job.job_id);
        await this.notify(job);
        await this.callbacks.flush();
    }

    private async process(lease: FencedQueueLease<EnhancementJob>): Promise<void> {
        let job = await this.jobs.get(lease.jobId); let staged: string | undefined; let stateCommitted = false;
        if (!job || this.terminal(job)) { await this.queue.acknowledge(lease); return; }
        const method = job.method || (job.mode.startsWith('ai_') ? 'ai' : 'standard');
        if (method !== 'ai') { await this.failCurrent(job, lease, 'wrong_worker_queue', 'Стандартна задача е отказана от AI worker.'); return; }
        if (job.cancel_requested || await this.jobs.isCancelRequested(job.job_id)) { await this.cancelBeforeStart(job, lease); return; }
        if (Date.now() >= job.deadline_at) { await this.failCurrent(job, lease, 'queue_deadline', 'AI задачата изтече, преди да започне.', 'timeout'); return; }
        try {
            if (!await this.queue.owns(lease)) throw new LostLeaseError('AI lease expired before execution.');
            this.uploads.assertOwnedPath(job.source_path); const source = await stat(job.source_path); if (!source.isFile()) throw new Error('Оригиналният файл липсва.');
            const started = await this.jobs.update(job.job_id, (current) => {
                const recoveredAttempt = lease.envelope.attempt > 0 && current.status === 'processing' && current.execution_token !== lease.token;
                if (this.terminal(current) || current.cancel_requested || (current.status !== 'pending' && !recoveredAttempt)) return null;
                current.status = 'processing'; current.started_at = new Date().toISOString(); current.progress = 1; current.execution_token = lease.token; current.execution_attempt = lease.envelope.attempt; return current;
            });
            if (!started) throw new LostLeaseError('AI job state changed before execution.');
            job = started; await this.notify(job);
            const outputPath = await this.jobs.aiAttemptProcessingPath(job.job_id, lease.token); const adapterPath = `${outputPath}.adapter.tmp`;
            await this.runAdapter(job, lease, adapterPath); await rename(adapterPath, outputPath);
            if (await this.jobs.isCancelRequested(job.job_id)) throw new AiAbortError('Задачата е отменена.', 'cancelled');
            const output = await this.processor.probe(outputPath); this.validateOutput(job, output);
            const prepared = await this.jobs.stagePublish(job, outputPath, lease.token); staged = prepared.staged;
            if (!await this.queue.renew(lease, this.config.enhancementAiLeaseSeconds) || !await this.queue.owns(lease)) throw new LostLeaseError('AI lease expired before publish.');
            const published = await this.jobs.commitStagedPublish(prepared.staged, prepared.destination); staged = undefined;
            if (!await this.queue.owns(lease)) throw new LostLeaseError('AI lease expired during publish.');
            const completed = await this.jobs.updateIfExecutionToken(job.job_id, lease.token, (current) => {
                if (current.cancel_requested || this.terminal(current)) return null;
                current.output_path = published; current.playback_url = this.config.publicUrl ? `${this.config.publicUrl}/enhancements/${current.video_id}/${basename(published)}` : undefined;
                current.output = output; current.status = 'completed'; current.progress = 100; current.completed_at = new Date().toISOString(); delete current.execution_token; delete current.execution_attempt; return current;
            });
            if (!completed) throw new LostLeaseError('AI execution was fenced before state commit.');
            job = completed; stateCommitted = true;
            if (!await this.queue.acknowledge(lease)) throw new LostLeaseError('AI lease expired before acknowledgement.');
            await this.jobs.releaseActive(job.upload_id, job.job_id); await this.jobs.clearCancelRequest(job.job_id); await this.jobs.cleanupAiAttempt(job.job_id, lease.token); await this.notify(job); await this.callbacks.flush();
        } catch (error) {
            if (staged) await this.jobs.discardStagedPublish(staged).catch(() => undefined);
            await this.jobs.cleanupAiAttempt(job.job_id, lease.token).catch(() => undefined);
            if (error instanceof LostLeaseError) { if (!stateCommitted) await this.jobs.discardAttemptPublish(job, lease.token).catch(() => undefined); console.error(JSON.stringify({ event: 'ai_video_enhancement_fenced', job_id: job.job_id, reason: error.message })); return; }
            if (error instanceof AiAbortError && error.code === 'preempted') { await this.requeuePreempted(job, lease, error); return; }
            if (!await this.queue.owns(lease)) { console.error(JSON.stringify({ event: 'ai_video_enhancement_fenced', job_id: job.job_id, reason: this.message(error) })); return; }
            const abort = error instanceof AiAbortError ? error : null;
            const failed = await this.jobs.updateIfExecutionToken(job.job_id, lease.token, (current) => {
                if (this.terminal(current)) return null;
                current.status = abort?.code === 'cancelled' ? 'cancelled' : abort ? 'timeout' : 'failed'; current.failure_code = abort?.code || 'ai_processing_failed'; current.failure_reason = abort?.message || this.message(error); current.completed_at = new Date().toISOString(); delete current.execution_token; delete current.execution_attempt; return current;
            });
            if (!failed) return; job = failed;
            await this.queue.acknowledge(lease); await this.jobs.releaseActive(job.upload_id, job.job_id); await this.jobs.clearCancelRequest(job.job_id); await this.notify(job); await this.callbacks.flush();
            console.error(JSON.stringify({ event: 'ai_video_enhancement_failed', job_id: job.job_id, video_id: job.video_id, status: job.status, reason: job.failure_reason }));
        }
    }

    private runAdapter(job: EnhancementJob, lease: FencedQueueLease<EnhancementJob>, outputPath: string): Promise<void> {
        const remainingSeconds = Math.max(1, Math.floor((job.deadline_at - Date.now()) / 1000) - this.config.enhancementFinalizeReserveSeconds);
        const target = job.target_short_side || (job.mode === 'ai_720p' ? 720 : 1080);
        const args = ['--protocol-version', '1', '--input', job.source_path, '--output', outputPath, '--target-short-side', String(target), '--deadline-seconds', String(remainingSeconds), '--max-workspace-bytes', String(this.config.enhancementAiMaxWorkspaceBytes), '--natural-detail', '--preserve-audio', '--preserve-timestamps'];
        return new Promise((resolve, reject) => {
            const child = spawn(this.config.enhancementAiCommand, args, { shell: false, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
            const pgid = child.pid; let stderr = ''; let stdout = ''; let settled = false; let terminationError: Error | undefined; let killTimer: NodeJS.Timeout | undefined; let leaseBusy = false; let preemptBusy = false;
            const finish = (error?: Error) => { if (settled) return; settled = true; if (this.activeTerminate === terminate) this.activeTerminate = undefined; clearInterval(cancelTimer); clearInterval(leaseTimer); clearInterval(preemptTimer); clearTimeout(deadlineTimer); if (killTimer) clearTimeout(killTimer); error ? reject(error) : resolve(); };
            const signalGroup = (signal: NodeJS.Signals) => { if (!pgid) return; try { process.kill(-pgid, signal); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') child.kill(signal); } };
            const terminate = (error: Error) => { if (terminationError) return; terminationError = error; signalGroup('SIGTERM'); killTimer = setTimeout(() => signalGroup('SIGKILL'), 5_000); };
            this.activeTerminate = terminate;
            const deadlineTimer = setTimeout(() => terminate(new AiAbortError(`AI обработката достигна лимита от ${Math.ceil(this.config.enhancementAiMaxTotalSeconds / 60)} минути.`, 'timeout')), remainingSeconds * 1000);
            const cancelTimer = setInterval(() => { void this.jobs.isCancelRequested(job.job_id).then((cancelled) => { if (cancelled) terminate(new AiAbortError('Задачата е отменена.', 'cancelled')); }).catch(() => undefined); }, 750);
            const leaseTimer = setInterval(() => { if (leaseBusy) return; leaseBusy = true; void this.queue.renew(lease, this.config.enhancementAiLeaseSeconds).then((renewed) => { if (!renewed) terminate(new LostLeaseError('AI lease heartbeat was rejected.')); }).catch((error) => terminate(new LostLeaseError(`AI lease heartbeat failed: ${this.message(error)}`))).finally(() => { leaseBusy = false; }); }, Math.max(5_000, Math.floor(this.config.enhancementAiLeaseSeconds * 1000 / 3)));
            const preemptTimer = setInterval(() => { if (preemptBusy) return; preemptBusy = true; void this.productionBusy().then((busy) => { if (busy) terminate(new AiAbortError('AI задачата беше отложена заради стандартна видео обработка.', 'preempted')); }).catch(() => undefined).finally(() => { preemptBusy = false; }); }, this.config.enhancementAiPreemptCheckMs);
            child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8'); child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-8_192); });
            child.stdout.on('data', (chunk) => { stdout = (stdout + chunk).slice(-16_384); const lines = stdout.split('\n'); stdout = lines.pop() || ''; for (const line of lines) { const match = line.trim().match(/^progress=(\d{1,3})$/); if (match) void this.saveProgress(job.job_id, lease.token, Number(match[1])); } });
            child.once('error', (error) => finish(terminationError || error));
            child.once('close', (code, signal) => { void (async () => {
                if (terminationError && pgid) await this.ensureProcessGroupStopped(pgid);
                if (terminationError) return finish(terminationError);
                code === 0 ? finish() : finish(new Error(`AI adapter failed (${signal || code}): ${stderr}`));
            })().catch((error) => finish(error instanceof Error ? error : new Error(String(error)))); });
        });
    }

    private async requeuePreempted(job: EnhancementJob, lease: FencedQueueLease<EnhancementJob>, error: AiAbortError): Promise<void> {
        if (!await this.queue.owns(lease)) return;
        const fresh = await this.jobs.updateIfExecutionToken(job.job_id, lease.token, (current) => {
            if (this.terminal(current)) return null;
            current.status = 'pending'; current.progress = 0; current.failure_code = 'preempted_for_standard_work'; current.failure_reason = error.message; delete current.execution_token; delete current.execution_attempt; return current;
        });
        if (!fresh) return;
        if (!await this.queue.requeue(lease, error.message)) throw new LostLeaseError('AI preemption lease was rejected.');
        console.log(JSON.stringify({ event: 'ai_video_enhancement_preempted', job_id: fresh.job_id }));
    }

    private async saveProgress(jobId: string, token: string, progress: number): Promise<void> {
        await this.jobs.updateIfExecutionToken(jobId, token, (fresh) => { if (fresh.cancel_requested || this.terminal(fresh)) return null; fresh.progress = Math.max(1, Math.min(97, progress)); return fresh; });
    }

    private validateOutput(job: EnhancementJob, output: ProbeResult): void {
        if (output.format !== 'mp4' || output.videoCodec !== 'h264' || (output.audioCodec !== null && output.audioCodec !== 'aac')) throw new Error('AI output is not compatible with the mobile player.');
        if (job.input.audioCodec && !output.audioCodec) throw new Error('AI output lost the input audio stream.');
        const fps = job.input.fps || 30; const durationTolerance = Math.max(0.25, 2 / fps);
        if (Math.abs(output.duration - job.input.duration) > durationTolerance) throw new Error('AI output duration drift is unsafe.');
        if (job.input.fps && (!output.fps || Math.abs(output.fps - job.input.fps) / job.input.fps > 0.005)) throw new Error('AI output frame rate differs from input.');
        const inputVfr = job.input.fps && job.input.nominalFps && Math.abs(job.input.fps - job.input.nominalFps) > 0.01;
        if (!inputVfr && job.input.frameCount && output.frameCount && job.input.frameCount !== output.frameCount) throw new Error('AI output frame count differs from input.');
        if (Math.min(output.width, output.height) !== (job.target_short_side || (job.mode === 'ai_720p' ? 720 : 1080))) throw new Error('AI output target short side is incorrect.');
        if (job.input.displayAspectRatio && (!output.displayAspectRatio || Math.abs(output.displayAspectRatio - job.input.displayAspectRatio) / job.input.displayAspectRatio > 0.005)) throw new Error('AI output display aspect ratio changed.');
        if ((output.rotation || 0) !== 0) throw new Error('AI output contains unexpected rotation metadata.');
        if (job.input.audioCodec && job.input.audioStartTime !== undefined && job.input.videoStartTime !== undefined && output.audioStartTime !== undefined && output.videoStartTime !== undefined) {
            const inputOffset = job.input.audioStartTime - job.input.videoStartTime; const outputOffset = output.audioStartTime - output.videoStartTime;
            if (Math.abs(inputOffset - outputOffset) > Math.max(0.08, 2 / fps)) throw new Error('AI output audio/video synchronization drift is unsafe.');
        }
    }

    private async cancelBeforeStart(job: EnhancementJob, lease: FencedQueueLease<EnhancementJob>): Promise<void> { if (!await this.queue.owns(lease)) return; const updated = await this.jobs.update(job.job_id, (current) => { if (this.terminal(current) || current.status !== 'pending' || current.execution_token) return null; current.status = 'cancelled'; current.completed_at = new Date().toISOString(); current.failure_code = 'cancelled_by_user'; return current; }); if (!updated || !await this.queue.acknowledge(lease)) return; await this.jobs.releaseActive(updated.upload_id, updated.job_id); await this.jobs.clearCancelRequest(updated.job_id); await this.notify(updated); }
    private async failCurrent(job: EnhancementJob, lease: FencedQueueLease<EnhancementJob>, code: string, reason: string, status: 'failed' | 'timeout' = 'failed'): Promise<void> { if (!await this.queue.owns(lease)) return; const updated = await this.jobs.update(job.job_id, (current) => { if (this.terminal(current) || current.status !== 'pending' || current.execution_token) return null; current.status = status; current.failure_code = code; current.failure_reason = reason; current.completed_at = new Date().toISOString(); return current; }); if (!updated) return; await this.queue.acknowledge(lease); await this.jobs.releaseActive(updated.upload_id, updated.job_id); await this.jobs.clearCancelRequest(updated.job_id); await this.notify(updated); }
    private async productionBusy(): Promise<boolean> { return (await Promise.all(this.protectedQueues.map((queue) => queue.depth()))).some((depth) => depth > 0); }
    private async ensureProcessGroupStopped(pgid: number): Promise<void> { for (let attempt = 0; attempt < 20; attempt++) { try { process.kill(-pgid, 0); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ESRCH') return; } if (attempt === 9) { try { process.kill(-pgid, 'SIGKILL'); } catch { return; } } await this.delay(100); } throw new Error('AI adapter process group did not terminate.'); }
    private terminal(job: EnhancementJob): boolean { return ['completed', 'failed', 'cancelled', 'timeout'].includes(job.status); }
    private message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
    private delay(milliseconds: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
    private async notify(job: EnhancementJob): Promise<void> { await this.callbacks.publish({ event_id: `enhancement:${job.job_id}:${job.status}`, event_type: 'video_enhancement', job_id: job.job_id, upload_id: job.upload_id, provider_video_id: job.upload_id, user_id: job.user_id, video_id: job.video_id, status: job.status, mode: job.mode, method: 'ai', target_short_side: job.target_short_side || (job.mode === 'ai_720p' ? 720 : 1080), progress: job.progress, result_url: job.playback_url || '', failure_code: job.failure_code || '', failure_reason: job.failure_reason || '' }); }
}
