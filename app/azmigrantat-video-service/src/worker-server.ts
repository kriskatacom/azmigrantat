import { loadConfig } from './config';
import { VideoCleanupService } from './cleanup';
import { RedisProcessingQueue } from './queue';
import { UploadStore } from './store';
import { ProcessingWorker } from './worker';

async function start(): Promise<void> {
    const config = loadConfig(); const store = new UploadStore(config.root); await store.init();
    const queue = new RedisProcessingQueue(config.redisUrl, config.queueKey); const worker = new ProcessingWorker(config, store, queue); const cleanup = new VideoCleanupService(config, store);
    const cleanupTimer = setInterval(() => { void cleanup.run().catch((error) => console.error('[video-cleanup]', error)); }, 60 * 60 * 1000); cleanupTimer.unref();
    process.once('SIGTERM', () => { worker.stop(); clearInterval(cleanupTimer); }); process.once('SIGINT', () => { worker.stop(); clearInterval(cleanupTimer); });
    await worker.start();
}

void start().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
