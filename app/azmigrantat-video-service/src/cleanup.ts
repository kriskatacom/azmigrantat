import { readdir, rm, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { VideoServiceConfig } from './config';
import { StatusCallbackOutbox } from './callbacks';
import { UploadStore } from './store';

const SAFE_ID = /^[a-f0-9-]{36}$/i;
export type CleanupResult = { removedParts: number; removedProcessing: number; removedTemporary: number; callbacksFlushed: boolean };

export class VideoCleanupService {
    constructor(private readonly config: VideoServiceConfig, private readonly store: UploadStore) {}
    async run(now = Date.now()): Promise<CleanupResult> {
        const result: CleanupResult = { removedParts: 0, removedProcessing: 0, removedTemporary: 0, callbacksFlushed: false };
        const uploadRoot = join(this.config.root, 'private', 'uploads');
        for (const name of await this.entries(uploadRoot)) {
            if (!name.endsWith('.part')) continue;
            const uploadId = name.slice(0, -5); if (!SAFE_ID.test(uploadId)) continue;
            const state = await this.store.get(uploadId); const file = join(uploadRoot, name); const age = now - (await stat(file)).mtimeMs;
            const active = state && ['created', 'uploading'].includes(state.status) && state.expiresAt * 1000 > now;
            if (!active && age >= this.config.retentionSeconds * 1000) { await unlink(file); result.removedParts++; }
        }
        const processingRoot = join(this.config.root, 'private', 'processing');
        for (const uploadId of await this.entries(processingRoot)) {
            if (!SAFE_ID.test(uploadId)) continue;
            const state = await this.store.get(uploadId); const directory = join(processingRoot, uploadId); const age = now - (await stat(directory)).mtimeMs;
            if (state?.status === 'processing' && age < this.config.retentionSeconds * 1000) continue;
            if (age >= this.config.retentionSeconds * 1000) { await rm(directory, { recursive: true, force: true }); result.removedProcessing++; }
        }
        for (const root of [join(this.config.root, 'public', 'videos'), join(this.config.root, 'public', 'thumbnails')]) {
            await this.removeTemporaryFiles(root, now, result);
        }
        await new StatusCallbackOutbox(this.config).flush(); result.callbacksFlushed = true;
        return result;
    }
    private async removeTemporaryFiles(root: string, now: number, result: CleanupResult): Promise<void> {
        for (const name of await this.entriesRecursive(root)) if (name.endsWith('.tmp')) { const path = name; if (now - (await stat(path)).mtimeMs >= this.config.retentionSeconds * 1000) { await unlink(path); result.removedTemporary++; } }
    }
    private async entries(path: string): Promise<string[]> { try { return await readdir(path); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; } }
    private async entriesRecursive(root: string): Promise<string[]> { const result: string[] = []; for (const name of await this.entries(root)) { const path = join(root, name); const info = await stat(path); if (info.isDirectory()) result.push(...await this.entriesRecursive(path)); else result.push(path); } return result; }
}
