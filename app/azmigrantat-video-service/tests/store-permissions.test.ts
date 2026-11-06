import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { UploadStore } from '../src/store';

test('published media is readable behind the group-restricted public tree', async () => {
    const root = await mkdtemp(join(tmpdir(), 'azmigrantat-video-permissions-'));
    try {
        const store = new UploadStore(root);
        await store.init();
        const videoId = 42;
        const uploadId = '11111111-1111-4111-8111-111111111111';
        const source = join(root, 'private', 'processing', 'source.mp4');
        await writeFile(source, 'video');

        const published = await store.publishVideo(uploadId, videoId, source);
        const metadata = await stat(published);
        const publicDirectory = await stat(join(root, 'public', 'videos'));
        assert.equal(metadata.mode & 0o777, 0o644);
        assert.equal(publicDirectory.mode & 0o007, 0);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
