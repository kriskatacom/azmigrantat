import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isAcceptedCompletionStatus, readProtectedEnv } from '../src/synthetic-e2e';
import { requestUploadHead } from '../src/synthetic-e2e';
import { deleteSyntheticUpload } from '../src/synthetic-e2e';

test('protected env parser reads token secret without exposing it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'azmigrantat-env-test-')); const path = join(directory, 'service.env');
    try { await writeFile(path, 'VIDEO_SERVICE_TOKEN_SECRET=unit-secret\nREDIS_URL=redis://127.0.0.1:6379\n'); await chmod(path, 0o640); const env = await readProtectedEnv(path); assert.equal(env.VIDEO_SERVICE_TOKEN_SECRET, 'unit-secret'); assert.equal(env.REDIS_URL, 'redis://127.0.0.1:6379'); } finally { await rm(directory, { recursive: true, force: true }); }
});

test('world-readable env file is rejected', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'azmigrantat-env-test-')); const path = join(directory, 'service.env');
    try { await writeFile(path, 'VIDEO_SERVICE_TOKEN_SECRET=unit-secret\n'); await chmod(path, 0o644); await assert.rejects(readProtectedEnv(path), /unsafe/); } finally { await rm(directory, { recursive: true, force: true }); }
});

test('synthetic E2E uses an actual HEAD request for offset recovery', async () => {
    const originalFetch = globalThis.fetch; let observedMethod = ''; let observedTus = '';
    globalThis.fetch = async (_input, init) => { observedMethod = String(init?.method || 'GET'); observedTus = String(new Headers(init?.headers).get('Tus-Resumable')); return new Response(null, { status: 200, headers: { 'Upload-Offset': '0' } }); };
    try { const response = await requestUploadHead('http://127.0.0.1:3100', '00000000-0000-4000-8000-000000000000', 'synthetic-token'); assert.equal(response.status, 200); assert.equal(response.headers.get('Upload-Offset'), '0'); assert.equal(observedMethod, 'HEAD'); assert.equal(observedTus, '1.0.0'); } finally { globalThis.fetch = originalFetch; }
});

test('synthetic completion accepts worker progress racing ahead of queued', () => {
    assert.equal(isAcceptedCompletionStatus('queued'), true);
    assert.equal(isAcceptedCompletionStatus('processing'), true);
    assert.equal(isAcceptedCompletionStatus('ready'), true);
    assert.equal(isAcceptedCompletionStatus('failed'), false);
});

test('synthetic DELETE retries only transient busy responses', async () => {
    const originalFetch = globalThis.fetch; const statuses = [409, 409, 204]; let calls = 0;
    globalThis.fetch = async () => new Response(null, { status: statuses[calls++] ?? 204 });
    try {
        const response = await deleteSyntheticUpload('http://127.0.0.1:3100/v1/uploads/test', 'synthetic-token', 1000);
        assert.equal(response.status, 204); assert.equal(calls, 3);
    } finally { globalThis.fetch = originalFetch; }
});
