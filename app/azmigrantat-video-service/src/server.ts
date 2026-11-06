import { loadConfig } from './config';
import { RedisProcessingQueue } from './queue';
import { UploadStore } from './store';
import { createVideoUploadServer } from './tus';

async function start(): Promise<void> {
    const config = loadConfig();
    const store = new UploadStore(config.root);
    await store.init();
    createVideoUploadServer({ config, store, queue: new RedisProcessingQueue(config.redisUrl, config.queueKey) }).listen(
        config.port,
        config.host,
        () => console.log(`Video upload service listening on http://${config.host}:${config.port}`),
    );
}

void start().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
