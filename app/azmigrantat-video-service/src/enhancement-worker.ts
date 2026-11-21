import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import type { VideoServiceConfig } from './config';
import { StatusCallbackOutbox } from './callbacks';
import { EnhancementStore } from './enhancement-store';
import { FfmpegProcessor } from './processing';
import { RedisJsonQueue, type JsonQueueLease } from './queue';
import { UploadStore } from './store';
import type { EnhancementJob } from './types';

class EnhancementAbortError extends Error {
    constructor(message: string, readonly code: 'cancelled' | 'timeout' | 'deadline_miss') { super(message); }
}

export class EnhancementWorker {
    private running = false;
    private readonly processor: FfmpegProcessor;
    private readonly callbacks: StatusCallbackOutbox;
    constructor(
        private readonly config: VideoServiceConfig,
        private readonly uploads: UploadStore,
        private readonly jobs: EnhancementStore,
        private readonly queue: RedisJsonQueue<EnhancementJob>,
    ) { this.processor = new FfmpegProcessor(config, uploads); this.callbacks = new StatusCallbackOutbox(config); }

    async start(): Promise<void> {
        if (this.running) return;
        this.running = true;
        for (const stale of await this.queue.recoverStale(this.config.enhancementMaxTotalSeconds)) {
            const job = await this.jobs.get(stale.job_id);
            if (job && !['completed', 'failed', 'cancelled', 'timeout'].includes(job.status)) {
                job.status = Date.now() >= job.deadline_at ? 'timeout' : 'failed';
                job.failure_code = 'worker_interrupted';
                job.failure_reason = 'Обработката беше прекъсната и може да бъде стартирана отново.';
                job.completed_at = new Date().toISOString();
                await this.jobs.save(job);
                await this.jobs.releaseActive(job.upload_id, job.job_id);
                await this.notify(job);
            }
        }
        const workers = Array.from({ length: this.config.enhancementConcurrency }, async () => {
            while (this.running) {
                const lease = await this.queue.claim();
                if (!lease) { await new Promise((resolve) => setTimeout(resolve, 500)); continue; }
                await this.process(lease);
            }
        });
        await Promise.all(workers);
    }
    stop(): void { this.running = false; }

    private async process(lease: JsonQueueLease<EnhancementJob>): Promise<void> {
        let job = await this.jobs.get(lease.envelope.job.job_id);
        if (!job) { await this.queue.acknowledge(lease); return; }
        const method = job.method || (job.mode.startsWith('ai_') ? 'ai' : 'standard');
        if (method !== 'standard') {
            job.status = 'failed'; job.failure_code = 'wrong_worker_queue'; job.failure_reason = 'AI задача е отказана от стандартния worker.'; job.completed_at = new Date().toISOString();
            await this.jobs.save(job); await this.jobs.releaseActive(job.upload_id, job.job_id); await this.queue.acknowledge(lease); await this.notify(job); return;
        }
        if (job.status === 'cancelled' || job.cancel_requested) {
            job.status = 'cancelled'; job.progress = 0; job.completed_at = new Date().toISOString();
            await this.jobs.save(job); await this.jobs.releaseActive(job.upload_id, job.job_id); await this.queue.acknowledge(lease); await this.notify(job); return;
        }
        if (Date.now() >= job.deadline_at) {
            job.status = 'timeout'; job.failure_code = 'queue_deadline'; job.failure_reason = 'Задачата изтече, преди да започне.'; job.completed_at = new Date().toISOString();
            await this.jobs.save(job); await this.jobs.releaseActive(job.upload_id, job.job_id); await this.queue.acknowledge(lease); await this.notify(job); return;
        }
        try {
            this.uploads.assertOwnedPath(job.source_path);
            const source = await stat(job.source_path);
            if (!source.isFile()) throw new Error('Оригиналният файл липсва.');
            job.status = 'processing'; job.started_at = new Date().toISOString(); job.progress = 1;
            await this.jobs.save(job); await this.notify(job);
            const outputPath = await this.jobs.processingPath(job.job_id);
            await this.runFast(job, outputPath);
            job = (await this.jobs.get(job.job_id)) || job;
            if (job.cancel_requested) throw new EnhancementAbortError('Задачата е отменена.', 'cancelled');
            const output = await this.processor.probe(outputPath);
            if (output.format !== 'mp4' || output.videoCodec !== 'h264' || (output.audioCodec !== null && output.audioCodec !== 'aac')) throw new Error('Подобреният файл не е съвместим с мобилния player.');
            const published = await this.jobs.publish(job, outputPath);
            job.output_path = published;
            job.playback_url = this.config.publicUrl ? `${this.config.publicUrl}/enhancements/${job.video_id}/${job.job_id}.mp4` : undefined;
            job.output = output; job.status = 'completed'; job.progress = 100; job.completed_at = new Date().toISOString();
            await this.jobs.save(job); await this.jobs.releaseActive(job.upload_id, job.job_id); await this.queue.acknowledge(lease); await this.jobs.cleanupProcessing(job.job_id); await this.notify(job); await this.callbacks.flush();
        } catch (error) {
            job = (await this.jobs.get(job.job_id)) || job;
            const abort = error instanceof EnhancementAbortError ? error : null;
            job.status = abort?.code === 'cancelled' ? 'cancelled' : abort ? 'timeout' : 'failed';
            job.failure_code = abort?.code || 'processing_failed';
            job.failure_reason = abort?.message || (error instanceof Error ? error.message : 'Видеообработката е неуспешна.');
            job.completed_at = new Date().toISOString();
            await this.jobs.save(job); await this.jobs.releaseActive(job.upload_id, job.job_id); await this.queue.acknowledge(lease); await this.jobs.cleanupProcessing(job.job_id); await this.notify(job); await this.callbacks.flush();
            console.error(JSON.stringify({ event: 'video_enhancement_failed', job_id: job.job_id, video_id: job.video_id, status: job.status, reason: job.failure_reason }));
        }
    }

    private runFast(job: EnhancementJob, outputPath: string): Promise<void> {
        const target = job.mode === 'fast_720p' ? 720 : 1080;
        const filter = `scale='if(gte(iw,ih),-2,${target})':'if(gte(iw,ih),${target},-2)':flags=lanczos,hqdn3d=1.0:1.0:3.0:3.0,unsharp=5:5:0.35:3:3:0.15`;
        const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', job.source_path, '-map', '0:v:0', '-map', '0:a:0?', '-vf', filter, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', String(this.config.enhancementFfmpegThreads), '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', '-y', outputPath];
        return new Promise((resolve, reject) => {
            const child = spawn(this.config.ffmpegBin, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
            const started = Date.now(); let stderr = ''; let stdout = ''; let settled = false; let processedFrames = 0;
            const finish = (error?: Error) => { if (settled) return; settled = true; clearInterval(cancelTimer); clearTimeout(deadlineTimer); error ? reject(error) : resolve(); };
            const terminate = (error: Error) => { child.kill('SIGTERM'); setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 2000).unref(); finish(error); };
            const deadlineMs = Math.max(1, job.deadline_at - Date.now() - this.config.enhancementFinalizeReserveSeconds * 1000);
            const deadlineTimer = setTimeout(() => terminate(new EnhancementAbortError('Обработката достигна лимита от 5 минути.', 'timeout')), deadlineMs);
            const cancelTimer = setInterval(() => {
                void this.jobs.get(job.job_id).then((fresh) => { if (fresh?.cancel_requested) terminate(new EnhancementAbortError('Задачата е отменена.', 'cancelled')); }).catch(() => undefined);
            }, 750);
            child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
            child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
            child.stdout.on('data', (chunk) => {
                stdout += chunk;
                const records = stdout.split('\n'); stdout = records.pop() || '';
                for (const record of records) {
                    const [key, value] = record.trim().split('=', 2);
                    if (key === 'frame') processedFrames = Math.max(processedFrames, Number(value) || 0);
                    if (key !== 'progress') continue;
                    const totalFrames = job.input.frameCount || job.input.duration * (job.input.fps || 30);
                    const progress = Math.max(1, Math.min(97, Math.floor((processedFrames / Math.max(1, totalFrames)) * 100)));
                    const elapsedSeconds = Math.max(0.1, (Date.now() - started) / 1000);
                    const measuredFps = processedFrames / elapsedSeconds;
                    job.progress = progress; job.processed_frames = processedFrames; job.processed_fps = Number(measuredFps.toFixed(2));
                    void this.jobs.save(job).catch(() => undefined);
                    if (elapsedSeconds >= 10 && measuredFps > 0) {
                        const remainingSeconds = (totalFrames - processedFrames) / measuredFps + this.config.enhancementFinalizeReserveSeconds;
                        if (Date.now() + remainingSeconds * 1000 > job.deadline_at) terminate(new EnhancementAbortError('Измерената скорост няма да покрие лимита от 5 минути.', 'deadline_miss'));
                    }
                }
            });
            child.once('error', (error) => finish(error));
            child.once('close', (code, signal) => { if (settled) return; if (code !== 0) finish(new Error(`ffmpeg failed (${signal || code}): ${stderr}`)); else finish(); });
        });
    }

    private async notify(job: EnhancementJob): Promise<void> {
        await this.callbacks.publish({
            event_id: `enhancement:${job.job_id}:${job.status}`,
            event_type: 'video_enhancement',
            job_id: job.job_id,
            upload_id: job.upload_id,
            provider_video_id: job.upload_id,
            user_id: job.user_id,
            video_id: job.video_id,
            status: job.status,
            mode: job.mode,
            method: job.method || 'standard',
            target_short_side: job.target_short_side || (job.mode === 'fast_720p' ? 720 : 1080),
            progress: job.progress,
            result_url: job.playback_url || '',
            failure_code: job.failure_code || '',
            failure_reason: job.failure_reason || '',
        });
    }
}
