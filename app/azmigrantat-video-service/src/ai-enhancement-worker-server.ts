import { loadConfig } from './config';
import { AiEnhancementWorker } from './ai-enhancement-worker';
import { EnhancementStore } from './enhancement-store';
import { FencedRedisJsonQueue } from './queue';
import { UploadStore } from './store';
import type { EnhancementJob } from './types';

async function start(): Promise<void> {
    const config = loadConfig(); const uploads = new UploadStore(config.root); const jobs = new EnhancementStore(config.root);
    await uploads.init(); await jobs.init();
    const worker = new AiEnhancementWorker(config, uploads, jobs, new FencedRedisJsonQueue<EnhancementJob>(config.redisUrl, config.enhancementAiQueueKey));
    process.once('SIGTERM', () => worker.stop()); process.once('SIGINT', () => worker.stop()); await worker.start();
}
void start().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
