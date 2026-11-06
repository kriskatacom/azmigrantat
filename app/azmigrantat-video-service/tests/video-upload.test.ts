import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import test from 'node:test';
import assert from 'node:assert/strict';

import type { VideoServiceConfig } from '../src/config';
import { InMemoryProcessingQueue } from '../src/queue';
import { UploadStore } from '../src/store';
import { createVideoUploadServer } from '../src/tus';
import { issueUploadToken } from '../src/token';

const secret = 'unit-test-video-upload-secret';
async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'azmigrantat-video-'));
    const config: VideoServiceConfig = { host: '127.0.0.1', port: 0, root, tokenSecret: secret, adminTokenSecret: 'unit-test-admin-secret', maxUploadBytes: 32, maxChunkBytes: 8, tokenTtlSeconds: 900, allowedMimeTypes: new Set(['video/mp4']), redisUrl: 'redis://127.0.0.1:6379', queueKey: 'test:queue', callbackUrl: '', callbackSecret: '', publicUrl: '', workerConcurrency: 1, minFreeBytes: 1, maxRetries: 3, leaseSeconds: 900, retentionSeconds: 86400, processTimeoutSeconds: 900, ffprobeBin: 'ffprobe', ffmpegBin: 'ffmpeg' };
    const store = new UploadStore(root); await store.init(); const queue = new InMemoryProcessingQueue(); const server = createVideoUploadServer({ config, store, queue });
    server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert.ok(address && typeof address !== 'string');
    return { root, store, queue, server, base: `http://127.0.0.1:${address.port}` };
}
async function cleanup(value: Awaited<ReturnType<typeof fixture>>) { value.server.close(); await once(value.server, 'close'); await rm(value.root, { recursive: true, force: true }); }
function token(uploadId: string, userId: number, videoId: number, exp = Math.floor(Date.now() / 1000) + 300) { return issueUploadToken({ upload_id: uploadId, user_id: userId, video_id: videoId, exp, max_size: 32, mime_type: 'video/mp4' }, secret); }

test('signed upload tokens reject tampering and expiry', async () => {
    const value = await fixture();
    try {
        const id = randomUUID(); const issued = token(id, 7, 9); const tampered = `${issued.slice(0, -1)}x`;
        const response = await fetch(`${value.base}/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${tampered}`, 'Tus-Resumable': '1.0.0', 'Upload-Length': '12', 'Content-Type': 'video/mp4' } });
        assert.equal(response.status, 401);
        const expired = token(randomUUID(), 7, 9, 1);
        const expiredResponse = await fetch(`${value.base}/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${expired}`, 'Tus-Resumable': '1.0.0', 'Upload-Length': '12', 'Content-Type': 'video/mp4' } });
        assert.equal(expiredResponse.status, 401);
    } finally { await cleanup(value); }
});

test('TUS create, HEAD, interrupted PATCH/resume and atomic completion are owner-bound', async () => {
    const value = await fixture();
    try {
        const id = randomUUID(); const auth = token(id, 7, 9);
        let response = await fetch(`${value.base}/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'Tus-Resumable': '1.0.0', 'Upload-Length': '12', 'Content-Type': 'video/mp4', 'Upload-Metadata': `filename ${Buffer.from('clip.mp4').toString('base64')}` } });
        assert.equal(response.status, 201); assert.equal((await response.json()).upload_id, id);
        response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'HEAD', headers: { Authorization: `Bearer ${auth}` } });
        assert.equal(response.status, 200); assert.equal(response.headers.get('upload-offset'), '0');
        const patchHeaders = { Authorization: `Bearer ${auth}`, 'Tus-Resumable': '1.0.0', 'Content-Type': 'application/offset+octet-stream' };
        response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'PATCH', headers: { ...patchHeaders, 'Upload-Offset': '0' }, body: Buffer.from('hello') });
        assert.equal(response.status, 204); assert.equal(response.headers.get('upload-offset'), '5');
        response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'PATCH', headers: { ...patchHeaders, 'Upload-Offset': '0' }, body: Buffer.from('wrong') });
        assert.equal(response.status, 409);
        const foreign = token(id, 8, 9);
        response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'HEAD', headers: { Authorization: `Bearer ${foreign}` } });
        assert.equal(response.status, 401);
        response = await fetch(`${value.base}/v1/uploads/${id}`, { method: 'PATCH', headers: { ...patchHeaders, 'Upload-Offset': '5' }, body: Buffer.from(' world!') });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('upload-offset'), '12');
        response = await fetch(`${value.base}/v1/uploads/${id}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${auth}` } });
        assert.equal(response.status, 200); assert.equal(response.headers.get('upload-offset'), '12'); assert.equal((await response.json()).status, 'queued');
        assert.equal(value.queue.jobs.length, 1); assert.equal(value.queue.jobs[0].user_id, 7); assert.equal(value.queue.jobs[0].video_id, 9);
        assert.equal(await readFile(value.queue.jobs[0].source_path, 'utf8'), 'hello world!');
        response = await fetch(`${value.base}/v1/uploads/${id}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${auth}` } });
        assert.equal(response.status, 200); assert.equal(value.queue.jobs.length, 1);
    } finally { await cleanup(value); }
});

test('final TUS PATCH auto-completes when the client misses the explicit complete request', async () => {
    const value = await fixture();
    try {
        const id = '11111111-1111-4111-8111-111111111111'; const auth = token(id, 7, 42);
        let response = await fetch(`${value.base}/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'Tus-Resumable': '1.0.0', 'Upload-Length': '11', 'Content-Type': 'video/mp4' } });
        assert.equal(response.status, 201);
        const uploadUrl = `${value.base}${response.headers.get('location')}`;
        response = await fetch(uploadUrl, { method: 'PATCH', headers: { Authorization: `Bearer ${auth}`, 'Tus-Resumable': '1.0.0', 'Upload-Offset': '0', 'Content-Type': 'application/offset+octet-stream' }, body: Buffer.from('hello') });
        assert.equal(response.status, 204);
        response = await fetch(uploadUrl, { method: 'PATCH', headers: { Authorization: `Bearer ${auth}`, 'Tus-Resumable': '1.0.0', 'Upload-Offset': '5', 'Content-Type': 'application/offset+octet-stream' }, body: Buffer.from(' world') });
        const completionBody = await response.text();
        assert.equal(response.status, 200, completionBody);
        assert.equal(response.headers.get('upload-offset'), '11');
        assert.equal(JSON.parse(completionBody).status, 'queued');
        response = await fetch(`${uploadUrl}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${auth}` } });
        assert.equal(response.status, 200);
        assert.equal(value.queue.jobs[0].video_id, 42);
        assert.equal((await value.store.get(id))?.status, 'queued');
    } finally { await cleanup(value); }
});

test('invalid MIME and oversized uploads are rejected', async () => {
    const value = await fixture();
    try {
        const response = await fetch(`${value.base}/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token(randomUUID(), 7, 9)}`, 'Tus-Resumable': '1.0.0', 'Upload-Length': '100', 'Content-Type': 'application/octet-stream' } });
        assert.equal(response.status, 400);
        const mimeResponse = await fetch(`${value.base}/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token(randomUUID(), 7, 9)}`, 'Tus-Resumable': '1.0.0', 'Upload-Length': '10', 'Content-Type': 'application/octet-stream' } });
        assert.equal(mimeResponse.status, 415);
    } finally { await cleanup(value); }
});
