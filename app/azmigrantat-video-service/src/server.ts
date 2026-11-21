import { loadConfig } from './config';
import { RedisProcessingQueue } from './queue';
import { UploadStore } from './store';
import { createVideoUploadServer } from './tus';
import { EnhancementStore } from './enhancement-store';
import { VideoEnhancementService } from './enhancement-service';
import type { EnhancementJob } from './types';
import { FencedRedisJsonQueue, RedisJsonQueue } from './queue';

async function start(): Promise<void> {
    const config = loadConfig();
    const store = new UploadStore(config.root);
    const enhancementStore = new EnhancementStore(config.root);
    await store.init(); await enhancementStore.init();
    const enhancementQueue = new RedisJsonQueue<EnhancementJob>(config.redisUrl, config.enhancementQueueKey);
    const aiEnhancementQueue = new FencedRedisJsonQueue<EnhancementJob>(config.redisUrl, config.enhancementAiQueueKey);
    const enhancementService = new VideoEnhancementService(config, store, enhancementStore, enhancementQueue, aiEnhancementQueue);
    createVideoUploadServer({ config, store, queue: new RedisProcessingQueue(config.redisUrl, config.queueKey), enhancementService }).listen(
        config.port,
        config.host,
        () => console.log(`Video upload service listening on http://${config.host}:${config.port}`),
    );
}

void start().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
