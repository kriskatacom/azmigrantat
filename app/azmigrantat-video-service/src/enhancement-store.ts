import { createHash, randomUUID } from 'node:crypto';
import { chmod, copyFile, mkdir, open, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { EnhancementJob, EnhancementStatus } from './types';

const SAFE_ID = /^[a-f0-9-]{36}$/i;
const TERMINAL = new Set<EnhancementStatus>(['completed', 'failed', 'cancelled', 'timeout']);

export class EnhancementStore {
    private readonly stateDirectory: string;
    private readonly idempotencyDirectory: string;
    private readonly activeDirectory: string;
    private readonly cancellationDirectory: string;
    private readonly lockDirectory: string;
    constructor(private readonly root: string) {
        this.stateDirectory = join(root, 'state', 'enhancements');
        this.idempotencyDirectory = join(root, 'state', 'enhancement-idempotency');
        this.activeDirectory = join(root, 'state', 'enhancement-active');
        this.cancellationDirectory = join(root, 'state', 'enhancement-cancel');
        this.lockDirectory = join(root, 'state', 'enhancement-locks');
    }
    async init(): Promise<void> {
        await Promise.all([
            mkdir(this.stateDirectory, { recursive: true, mode: 0o750 }),
            mkdir(this.idempotencyDirectory, { recursive: true, mode: 0o750 }),
            mkdir(this.activeDirectory, { recursive: true, mode: 0o750 }),
            mkdir(this.cancellationDirectory, { recursive: true, mode: 0o750 }),
            mkdir(this.lockDirectory, { recursive: true, mode: 0o750 }),
            mkdir(join(this.root, 'private', 'enhancements'), { recursive: true, mode: 0o750 }),
            mkdir(join(this.root, 'private', 'ai-enhancements'), { recursive: true, mode: 0o750 }),
            mkdir(join(this.root, 'public', 'enhancements'), { recursive: true, mode: 0o750 }),
        ]);
    }
    async save(job: EnhancementJob): Promise<void> {
        this.assertId(job.job_id);
        await this.withJobLock(job.job_id, () => this.writeUnlocked(job));
    }
    private async writeUnlocked(job: EnhancementJob): Promise<void> {
        const path = this.statePath(job.job_id);
        const temporary = `${path}.${randomUUID()}.tmp`;
        await writeFile(temporary, JSON.stringify(job), { mode: 0o640 });
        await rename(temporary, path);
    }
    async update(jobId: string, updater: (current: EnhancementJob) => EnhancementJob | null): Promise<EnhancementJob | null> {
        return this.withJobLock(jobId, async () => {
            const current = await this.get(jobId); if (!current) return null;
            const next = updater(current); if (!next) return null;
            await this.writeUnlocked(next); return next;
        });
    }
    async updateIfExecutionToken(jobId: string, token: string, updater: (current: EnhancementJob) => EnhancementJob | null): Promise<EnhancementJob | null> {
        return this.update(jobId, (current) => current.execution_token === token ? updater(current) : null);
    }
    async get(jobId: string): Promise<EnhancementJob | null> {
        this.assertId(jobId);
        try { return JSON.parse(await readFile(this.statePath(jobId), 'utf8')) as EnhancementJob; }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    }
    async reserveIdempotency(key: string, jobId: string): Promise<string | null> {
        this.assertId(jobId);
        const path = this.idempotencyPath(key);
        try {
            const handle = await open(path, 'wx', 0o640);
            try { await handle.writeFile(jobId); } finally { await handle.close(); }
            return null;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            const existing = (await readFile(path, 'utf8')).trim();
            this.assertId(existing);
            return existing;
        }
    }
    async releaseIdempotency(key: string, jobId: string): Promise<void> {
        const path = this.idempotencyPath(key);
        try { if ((await readFile(path, 'utf8')).trim() === jobId) await unlink(path); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    async reserveActive(uploadId: string, jobId: string): Promise<string | null> {
        if (!SAFE_ID.test(uploadId)) throw new Error('Unsafe upload identifier.');
        const path = join(this.activeDirectory, `${uploadId}.txt`);
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const handle = await open(path, 'wx', 0o640);
                try { await handle.writeFile(jobId); } finally { await handle.close(); }
                return null;
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
                const existingId = (await readFile(path, 'utf8')).trim(); this.assertId(existingId);
                const existing = await this.get(existingId);
                if (existing && !TERMINAL.has(existing.status)) return existingId;
                await unlink(path);
            }
        }
        throw new Error('Could not reserve enhancement slot.');
    }
    async releaseActive(uploadId: string, jobId: string): Promise<void> {
        if (!SAFE_ID.test(uploadId)) throw new Error('Unsafe upload identifier.');
        const path = join(this.activeDirectory, `${uploadId}.txt`);
        try { if ((await readFile(path, 'utf8')).trim() === jobId) await unlink(path); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    async activeForUpload(uploadId: string): Promise<EnhancementJob | null> {
        for (const name of await readdir(this.stateDirectory)) {
            if (!name.endsWith('.json')) continue;
            const job = JSON.parse(await readFile(join(this.stateDirectory, name), 'utf8')) as EnhancementJob;
            if (job.upload_id === uploadId && !TERMINAL.has(job.status)) return job;
        }
        return null;
    }
    async processingPath(jobId: string): Promise<string> {
        this.assertId(jobId);
        const directory = join(this.root, 'private', 'enhancements', jobId);
        await mkdir(directory, { recursive: true, mode: 0o750 });
        return join(directory, `${jobId}.mp4`);
    }
    async aiProcessingPath(jobId: string): Promise<string> {
        this.assertId(jobId);
        const directory = join(this.root, 'private', 'ai-enhancements', jobId);
        await mkdir(directory, { recursive: true, mode: 0o750 });
        return join(directory, `${jobId}.mp4`);
    }
    async aiAttemptProcessingPath(jobId: string, leaseToken: string): Promise<string> {
        this.assertId(jobId); this.assertId(leaseToken);
        const directory = join(this.root, 'private', 'ai-enhancements', jobId, leaseToken);
        await mkdir(directory, { recursive: true, mode: 0o750 });
        return join(directory, `${jobId}.mp4`);
    }
    async stagePublish(job: EnhancementJob, sourcePath: string, leaseToken: string): Promise<{ staged: string; destination: string }> {
        this.assertId(job.job_id); this.assertId(leaseToken); this.assertOwnedPath(sourcePath);
        const destination = join(this.root, 'public', 'enhancements', String(job.video_id), `${job.job_id}-${leaseToken}.mp4`);
        await mkdir(dirname(destination), { recursive: true, mode: 0o750 });
        const staged = `${destination}.${leaseToken}.tmp`;
        await copyFile(sourcePath, staged);
        return { staged, destination };
    }
    async commitStagedPublish(staged: string, destination: string): Promise<string> {
        this.assertOwnedPath(staged); this.assertOwnedPath(destination);
        await rename(staged, destination); await chmod(destination, 0o644); return destination;
    }
    async discardStagedPublish(staged: string): Promise<void> { this.assertOwnedPath(staged); await rm(staged, { force: true }); }
    async discardAttemptPublish(job: EnhancementJob, leaseToken: string): Promise<void> {
        this.assertId(job.job_id); this.assertId(leaseToken);
        const destination = join(this.root, 'public', 'enhancements', String(job.video_id), `${job.job_id}-${leaseToken}.mp4`);
        await Promise.all([rm(destination, { force: true }), rm(`${destination}.${leaseToken}.tmp`, { force: true })]);
    }
    async publish(job: EnhancementJob, sourcePath: string): Promise<string> {
        this.assertId(job.job_id);
        this.assertOwnedPath(sourcePath);
        const destination = join(this.root, 'public', 'enhancements', String(job.video_id), `${job.job_id}.mp4`);
        await mkdir(dirname(destination), { recursive: true, mode: 0o750 });
        const temporary = `${destination}.${randomUUID()}.tmp`;
        await copyFile(sourcePath, temporary);
        await rename(temporary, destination);
        await chmod(destination, 0o644);
        return destination;
    }
    async cleanupProcessing(jobId: string): Promise<void> {
        this.assertId(jobId);
        await rm(join(this.root, 'private', 'enhancements', jobId), { recursive: true, force: true });
    }
    async cleanupAiProcessing(jobId: string): Promise<void> {
        this.assertId(jobId);
        await rm(join(this.root, 'private', 'ai-enhancements', jobId), { recursive: true, force: true });
    }
    async cleanupAiAttempt(jobId: string, leaseToken: string): Promise<void> {
        this.assertId(jobId); this.assertId(leaseToken);
        await rm(join(this.root, 'private', 'ai-enhancements', jobId, leaseToken), { recursive: true, force: true });
    }
    async requestCancel(jobId: string): Promise<void> {
        this.assertId(jobId); await writeFile(join(this.cancellationDirectory, `${jobId}.flag`), new Date().toISOString(), { mode: 0o640 });
    }
    async isCancelRequested(jobId: string): Promise<boolean> {
        this.assertId(jobId); try { await readFile(join(this.cancellationDirectory, `${jobId}.flag`)); return true; }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
    }
    async clearCancelRequest(jobId: string): Promise<void> {
        this.assertId(jobId); try { await unlink(join(this.cancellationDirectory, `${jobId}.flag`)); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    assertOwnedPath(path: string): void {
        if (!path.startsWith(`${this.root}/`)) throw new Error('Path is outside video service root.');
    }
    private statePath(jobId: string): string { return join(this.stateDirectory, `${jobId}.json`); }
    private idempotencyPath(key: string): string {
        if (key.length < 8 || key.length > 180) throw new Error('Invalid idempotency key.');
        return join(this.idempotencyDirectory, `${createHash('sha256').update(key).digest('hex')}.txt`);
    }
    private async withJobLock<T>(jobId: string, operation: () => Promise<T>): Promise<T> {
        this.assertId(jobId); const lockPath = join(this.lockDirectory, `${jobId}.lock`); const owner = `${process.pid}:${randomUUID()}`; let handle;
        for (let attempt = 0; attempt < 200; attempt++) {
            try { handle = await open(lockPath, 'wx', 0o640); await handle.writeFile(owner); break; }
            catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
                try {
                    const existing = (await readFile(lockPath, 'utf8')).trim(); const pid = Number(existing.split(':', 1)[0]);
                    if (!Number.isSafeInteger(pid) || pid <= 0) await unlink(lockPath);
                    else { try { process.kill(pid, 0); } catch (pidError) { if ((pidError as NodeJS.ErrnoException).code === 'ESRCH') await unlink(lockPath); else throw pidError; } }
                } catch (lockError) { if ((lockError as NodeJS.ErrnoException).code !== 'ENOENT') throw lockError; }
                await new Promise((resolve) => setTimeout(resolve, 25));
            }
        }
        if (!handle) throw new Error('Timed out acquiring enhancement state lock.');
        try { return await operation(); }
        finally {
            await handle.close();
            try { if ((await readFile(lockPath, 'utf8')).trim() === owner) await unlink(lockPath); }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        }
    }
    private assertId(value: string): void { if (!SAFE_ID.test(value)) throw new Error('Unsafe enhancement identifier.'); }
}
