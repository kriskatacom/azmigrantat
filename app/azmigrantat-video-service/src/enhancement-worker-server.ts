import { loadConfig } from './config';
import { EnhancementStore } from './enhancement-store';
import { EnhancementWorker } from './enhancement-worker';
import { RedisJsonQueue } from './queue';
import { UploadStore } from './store';
import type { EnhancementJob } from './types';

async function start(): Promise<void> {
    const config = loadConfig();
    const uploads = new UploadStore(config.root); const jobs = new EnhancementStore(config.root);
    await uploads.init(); await jobs.init();
    const worker = new EnhancementWorker(config, uploads, jobs, new RedisJsonQueue<EnhancementJob>(config.redisUrl, config.enhancementQueueKey));
    process.once('SIGTERM', () => worker.stop()); process.once('SIGINT', () => worker.stop());
    await worker.start();
}

void start().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
