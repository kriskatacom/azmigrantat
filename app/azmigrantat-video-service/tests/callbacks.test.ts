import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import test from 'node:test';
import assert from 'node:assert/strict';
import type { VideoServiceConfig } from '../src/config';
import { StatusCallbackOutbox } from '../src/callbacks';

function config(root: string, callbackUrl: string): VideoServiceConfig {
    return { host: '127.0.0.1', port: 0, root, tokenSecret: 'test', adminTokenSecret: 'unit-test-admin-secret', maxUploadBytes: 1000, maxChunkBytes: 100, tokenTtlSeconds: 900, allowedMimeTypes: new Set(['video/mp4']), redisUrl: 'redis://127.0.0.1:6379', queueKey: 'test:queue', callbackUrl, callbackSecret: 'callback-secret', publicUrl: 'https://media.test', workerConcurrency: 1, minFreeBytes: 1, maxRetries: 3, leaseSeconds: 1, retentionSeconds: 10, processTimeoutSeconds: 10, ffprobeBin: 'ffprobe', ffmpegBin: 'ffmpeg' };
}

test('callback outbox delivers signed idempotent events and retains failed delivery', async () => {
    const root = await mkdtemp(join(tmpdir(), 'azmigrantat-callback-'));
    const received: Array<{ body: string; signature: string | null }> = [];
    const server = createServer((request, response) => {
        let body = '';
        request.setEncoding('utf8');
        request.on('data', (chunk) => { body += chunk; });
        request.on('end', () => { received.push({ body, signature: request.headers['x-video-service-signature'] as string | null }); response.writeHead(200).end(); });
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    try {
        const outbox = new StatusCallbackOutbox(config(root, `http://127.0.0.1:${address.port}/callback`));
        await outbox.publish({ event_id: 'upload:ready', status: 'ready', upload_id: 'upload' });
        await outbox.publish({ event_id: 'upload:ready', status: 'ready', upload_id: 'upload' });
        assert.equal(received.length, 1);
        assert.equal(JSON.parse(received[0].body).status, 'ready');
        assert.match(received[0].signature || '', /^[a-f0-9]{64}$/);
        const failed = new StatusCallbackOutbox(config(root, 'http://127.0.0.1:1/unavailable'));
        await failed.publish({ event_id: 'upload:failed', status: 'failed', upload_id: 'upload' });
        const files = await readdir(join(root, 'state', 'callbacks'));
        assert.deepEqual(files.sort(), ['upload:failed.json']);
        const persisted = JSON.parse(await readFile(join(root, 'state', 'callbacks', 'upload:failed.json'), 'utf8')) as { attempts: number };
        assert.equal(persisted.attempts, 1);
    } finally {
        server.close(); await once(server, 'close'); await rm(root, { recursive: true, force: true });
    }
});
