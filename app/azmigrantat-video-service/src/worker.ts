import type { VideoServiceConfig } from './config';
import { StatusCallbackOutbox } from './callbacks';
import { DiskSpaceGuard } from './guards';
import type { DurableProcessingQueue } from './queue';
import { FfmpegProcessor } from './processing';
import { UploadStore } from './store';
import type { ProcessingJob } from './types';

export interface JobProcessor { process(job: ProcessingJob): Promise<{ mode: string; outputPath: string; thumbnailPath: string; probe: { duration: number; size: number; width: number; height: number } }>; }

export class ProcessingWorker {
    private readonly guard: DiskSpaceGuard;
    private readonly callbacks: StatusCallbackOutbox;
    private running = false;
    constructor(private readonly config: VideoServiceConfig, private readonly store: UploadStore, private readonly queue: DurableProcessingQueue, private readonly processor: JobProcessor = new FfmpegProcessor(config, store)) { this.guard = new DiskSpaceGuard(config.root, config.minFreeBytes); this.callbacks = new StatusCallbackOutbox(config); }
    async processOne(): Promise<boolean> {
        const lease = await this.queue.claim(); if (!lease) return false;
        const job = lease.envelope.job;
        if (!/^[a-f0-9-]{36}$/i.test(job.upload_id) || !Number.isSafeInteger(job.video_id) || job.video_id < 1) { await this.queue.retry(lease, 'invalid processing job', this.config.maxRetries); return true; }
        const lock = await this.store.acquireProcessLock(job.upload_id);
        if (!lock) {
            console.warn(JSON.stringify({ event: 'video_processing_deferred', upload_id: job.upload_id, user_id: job.user_id, video_id: job.video_id, reason: 'upload lock busy' }));
            await this.queue.retry(lease, 'upload lock busy', this.config.maxRetries);
            return true;
        }
        try {
            const state = await this.store.get(job.upload_id);
            if (!state || state.status === 'ready' || state.status === 'deleting') { await this.queue.acknowledge(lease); return true; }
            await this.guard.assertEnough(job.size);
            state.status = 'processing'; state.updatedAt = new Date().toISOString(); await this.store.save(state);
            await this.callbacks.publish({ event_id: `${job.upload_id}:processing`, upload_id: job.upload_id, provider_video_id: job.upload_id, user_id: job.user_id, video_id: job.video_id, status: 'processing' });
            const result = await this.processor.process(job);
            const playbackPath = await this.store.publishVideo(job.upload_id, job.video_id, result.outputPath);
            const thumbnailPath = await this.store.publishThumbnail(job.upload_id, job.video_id, result.thumbnailPath);
            state.status = 'ready'; state.sourcePath = job.source_path; state.playbackPath = playbackPath; state.thumbnailPath = thumbnailPath; state.duration = result.probe.duration; state.width = result.probe.width; state.height = result.probe.height; state.fileSize = result.probe.size; state.updatedAt = new Date().toISOString(); await this.store.save(state);
            const publicBase = this.config.publicUrl;
            await this.callbacks.publish({ event_id: `${job.upload_id}:ready`, upload_id: job.upload_id, provider_video_id: job.upload_id, user_id: job.user_id, video_id: job.video_id, status: 'ready', storage_path: playbackPath, playback_url: publicBase ? `${publicBase}/videos/${job.video_id}/${job.upload_id}.mp4` : '', thumbnail_url: publicBase ? `${publicBase}/thumbnails/${job.video_id}/${job.upload_id}.jpg` : '', duration: result.probe.duration, width: result.probe.width, height: result.probe.height, file_size: result.probe.size });
            await this.queue.acknowledge(lease); await this.callbacks.flush(); return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'processing failed'; const finalAttempt = lease.envelope.attempts + 1 >= this.config.maxRetries; const state = await this.store.get(job.upload_id);
            console.error(JSON.stringify({ event: 'video_processing_failed', upload_id: job.upload_id, user_id: job.user_id, video_id: job.video_id, attempt: lease.envelope.attempts + 1, final_attempt: finalAttempt, reason: message }));
            if (state) { state.failureReason = message; if (finalAttempt) state.status = 'failed'; state.updatedAt = new Date().toISOString(); await this.store.save(state); }
            if (finalAttempt && state) { await this.callbacks.publish({ event_id: `${job.upload_id}:failed`, upload_id: job.upload_id, provider_video_id: job.upload_id, user_id: job.user_id, video_id: job.video_id, status: 'failed', failure_reason: message }); }
            await this.queue.retry(lease, message, this.config.maxRetries); await this.callbacks.flush(); return true;
        } finally { await lock(); }
    }
    async recover(): Promise<void> { await this.queue.recoverStale(this.config.leaseSeconds, this.config.maxRetries); await this.callbacks.flush(); }
    async start(): Promise<void> {
        if (this.running) return; this.running = true; await this.recover();
        const workers = Array.from({ length: this.config.workerConcurrency }, async () => { while (this.running) { const processed = await this.processOne(); if (!processed) await new Promise((resolve) => setTimeout(resolve, 250)); } });
        await Promise.all(workers);
    }
    stop(): void { this.running = false; }
}
