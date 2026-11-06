import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import test from 'node:test';
import assert from 'node:assert/strict';
import type { VideoServiceConfig } from '../src/config';
import { issueDeleteToken } from '../src/admin-token';
import { issueUploadToken } from '../src/token';
import { InMemoryProcessingQueue } from '../src/queue';
import { UploadStore } from '../src/store';
import { createVideoUploadServer } from '../src/tus';

const uploadSecret = 'delete-upload-secret';
const adminSecret = 'delete-admin-secret';
async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'azmigrantat-delete-'));
    const config: VideoServiceConfig = { host: '127.0.0.1', port: 0, root, tokenSecret: uploadSecret, adminTokenSecret: adminSecret, maxUploadBytes: 1000, maxChunkBytes: 100, tokenTtlSeconds: 900, allowedMimeTypes: new Set(['video/mp4']), redisUrl: 'redis://127.0.0.1:6379', queueKey: 'test:queue', callbackUrl: '', callbackSecret: '', publicUrl: '', workerConcurrency: 1, minFreeBytes: 1, maxRetries: 3, leaseSeconds: 900, retentionSeconds: 86400, processTimeoutSeconds: 900, ffprobeBin: 'ffprobe', ffmpegBin: 'ffmpeg' };
    const store = new UploadStore(root); await store.init(); const server = createVideoUploadServer({ config, store, queue: new InMemoryProcessingQueue() });
    server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert.ok(address && typeof address !== 'string');
    return { root, store, server, base: `http://127.0.0.1:${address.port}` };
}
async function cleanup(value: Awaited<ReturnType<typeof fixture>>) { value.server.close(); await once(value.server, 'close'); await rm(value.root, { recursive: true, force: true }); }
function deleteToken(uploadId: string, userId = 7, videoId = 9, exp = Math.floor(Date.now() / 1000) + 300) { return issueDeleteToken({ action: 'delete', provider: 'oneprovider', upload_id: uploadId, user_id: userId, video_id: videoId, exp }, adminSecret); }

test('DELETE removes only owned artifacts, writes tombstone and is idempotent', async () => {
    const value = await fixture();
    try {
        const id = randomUUID(); const state = value.store.createState({ uploadId: id, userId: 7, videoId: 9, uploadLength: 1, metadata: { filename: 'clip.mp4' }, mimeType: 'video/mp4', expiresAt: Date.now() / 1000 + 300 });
        await value.store.save(state); await value.store.append(id, Buffer.from('x'));
        let response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${deleteToken(id)}` } });
        assert.equal(response.status, 204); assert.equal(await value.store.get(id), null); assert.deepEqual(await value.store.getTombstone(id), { uploadId: id, userId: 7, videoId: 9, provider: 'oneprovider' });
        response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${deleteToken(id)}` } }); assert.equal(response.status, 204);
    } finally { await cleanup(value); }
});

test('DELETE rejects foreign, expired and upload tokens without deleting', async () => {
    const value = await fixture();
    try {
        const id = randomUUID(); const state = value.store.createState({ uploadId: id, userId: 7, videoId: 9, uploadLength: 1, metadata: { filename: 'clip.mp4' }, mimeType: 'video/mp4', expiresAt: Date.now() / 1000 + 300 }); await value.store.save(state);
        let response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${deleteToken(id, 8, 9)}` } }); assert.equal(response.status, 403);
        response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${deleteToken(id, 7, 9, 1)}` } }); assert.equal(response.status, 401);
        const upload = issueUploadToken({ upload_id: id, user_id: 7, video_id: 9, exp: Math.floor(Date.now() / 1000) + 300, max_size: 1, mime_type: 'video/mp4' }, uploadSecret);
        response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${upload}` } }); assert.equal(response.status, 401);
        assert.ok(await value.store.get(id)); await stat(join(value.root, 'state', `${id}.json`));
    } finally { await cleanup(value); }
});

test('DELETE returns not found for an unknown upload without creating a tombstone', async () => {
    const value = await fixture();
    try {
        const id = randomUUID(); const response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${deleteToken(id)}` } });
        assert.equal(response.status, 404); assert.equal(await value.store.getTombstone(id), null);
    } finally { await cleanup(value); }
});

test('DELETE rejects an upload-signed token and a token with the wrong admin header', async () => {
    const value = await fixture();
    try {
        const id = randomUUID(); const state = value.store.createState({ uploadId: id, userId: 7, videoId: 9, uploadLength: 1, metadata: { filename: 'clip.mp4' }, mimeType: 'video/mp4', expiresAt: Math.floor(Date.now() / 1000) + 300 }); await value.store.save(state);
        const upload = issueUploadToken({ upload_id: id, user_id: 7, video_id: 9, exp: Math.floor(Date.now() / 1000) + 300, max_size: 1, mime_type: 'video/mp4' }, uploadSecret);
        const wrongHeader = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'AZM_UPLOAD' })).toString('base64url')}.${upload.split('.')[1]}.${Buffer.from('invalid').toString('base64url')}`;
        const response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${wrongHeader}` } });
        assert.equal(response.status, 401); assert.ok(await value.store.get(id));
    } finally { await cleanup(value); }
});
