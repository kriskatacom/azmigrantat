import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { MigrationLock, MigrationStateStore, MysqlVideoRepository, createMysqlRepository, expandTemplate, hlsCopyRemuxArgs, redactUrl, rewriteHlsPlaylistWithLocalFiles, rewriteValidatedHlsPlaylist, rowFingerprint, safeJoin, sanitizeErrorMessage, validateHlsPlaylistResources, validateSingleTargetOptions, writeJsonImmutable } from '../src/bunny-migration';
import { parseArgs } from '../src/migrate-bunny';

test('migration state is written atomically and can resume', async () => {
    const root = await mkdtemp(join(tmpdir(), 'azmigrantat-migration-'));
    try {
        const path = join(root, 'state', 'migration.json');
        const store = new MigrationStateStore(path);
        const state = { version: 1 as const, entries: { '753007:guid': { bunnyGuid: 'guid', videoId: 7, dedicatedId: 'dedicated', status: 'verified' as const, updatedAt: new Date().toISOString() } } };
        await store.save(state);
        assert.deepEqual(await store.load(), state);
        assert.equal((await readFile(path, 'utf8')).includes('dedicated'), true);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('migration paths and URL logging are safe', () => {
    assert.equal(expandTemplate('https://example/{libraryId}/{guid}', 753007, 'a/b'), 'https://example/753007/a%2Fb');
    assert.throws(() => safeJoin('/srv/video', '..', 'outside'));
    assert.equal(redactUrl('https://bunny.example/file.mp4?token=secret'), 'https://bunny.example/file.mp4');
    const signed = 'https://video.example/bcdn_token=HS256-super-secret&token_path=%2Fguid%2F&expires=1/guid/playlist.m3u8';
    assert.equal(redactUrl(signed).includes('super-secret'), false);
    assert.equal(redactUrl(signed).includes('[redacted-token]'), true);
    assert.equal(sanitizeErrorMessage(`failed ${signed}`).includes('super-secret'), false);
});

test('nested HLS segments, keys and maps must stay on the expected HTTPS host and GUID path', () => {
    const base = 'https://video.example/bcdn_token=redacted/ba8a28ca-603b-4563-be47-3574a773d91d/720p/video.m3u8';
    const valid = '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\n#EXT-X-MAP:URI="init.mp4"\nsegment0.ts\n';
    assert.equal(validateHlsPlaylistResources(valid, base, 'video.example', 'ba8a28ca-603b-4563-be47-3574a773d91d').length, 3);
    const rewritten = rewriteValidatedHlsPlaylist(valid, base, 'video.example', 'ba8a28ca-603b-4563-be47-3574a773d91d');
    assert.equal(rewritten.includes('URI="https://video.example/'), true);
    assert.equal(rewritten.includes('\nhttps://video.example/'), true);
    const resources = validateHlsPlaylistResources(valid, base, 'video.example', 'ba8a28ca-603b-4563-be47-3574a773d91d');
    const local = new Map(resources.map((url, index) => [url, `/srv/staging/hls/${index}.bin`]));
    const localized = rewriteHlsPlaylistWithLocalFiles(valid, base, 'video.example', 'ba8a28ca-603b-4563-be47-3574a773d91d', local);
    assert.equal(localized.includes('https://'), false);
    assert.equal(localized.includes('file:///srv/staging/hls/'), true);
    assert.throws(() => validateHlsPlaylistResources('#EXTM3U\nhttps://attacker.example/segment.ts\n', base, 'video.example', 'ba8a28ca-603b-4563-be47-3574a773d91d'), /escaped/);
    assert.throws(() => validateHlsPlaylistResources('#EXTM3U\nhttp://video.example/ba8a28ca-603b-4563-be47-3574a773d91d/segment.ts\n', base, 'video.example', 'ba8a28ca-603b-4563-be47-3574a773d91d'), /escaped/);
});

test('HLS copy-remux forces the stdin demuxer and gives FFmpeg no network protocol', () => {
    const args = hlsCopyRemuxArgs('/srv/staging/output.mp4');
    assert.deepEqual(args.slice(0, 8), ['-y', '-protocol_whitelist', 'pipe,file,crypto', '-f', 'hls', '-i', 'pipe:0', '-map']);
    assert.equal(args.includes('-max_redirects'), false);
    assert.equal(args.includes('http'), false);
    assert.equal(args.includes('https'), false);
    assert.equal(args.includes('copy'), true);
});

test('single-target arguments reject omissions, zero and NaN instead of broadening selection', () => {
    assert.throws(() => validateSingleTargetOptions({ dryRun: true, execute: false, commit: false, confirmCommit: false, resume: true, retries: 3 }));
    assert.throws(() => validateSingleTargetOptions({ dryRun: true, execute: false, commit: false, confirmCommit: false, resume: true, retries: 3, videoId: Number.NaN, ownerId: 1269, guid: 'ba8a28ca-603b-4563-be47-3574a773d91d' }));
    assert.throws(() => parseArgs(['--video-id', '0', '--owner-id', '1269', '--guid', 'ba8a28ca-603b-4563-be47-3574a773d91d']));
    const parsed = parseArgs(['--video-id', '78', '--owner-id', '1269', '--guid', 'ba8a28ca-603b-4563-be47-3574a773d91d']);
    validateSingleTargetOptions(parsed);
    assert.equal(parsed.videoId, 78);
    assert.equal(parsed.ownerId, 1269);
});

test('isolated DB table override is explicit and allowlisted', async () => {
    assert.throws(() => createMysqlRepository({ BUNNY_MIGRATION_DB_TABLE: 'videos_migration_e2e_20261026' }), /requires/);
    assert.throws(() => new MysqlVideoRepository({} as never, 'videos; DROP TABLE users'), /allowlisted/);
    const repository = createMysqlRepository({
        BUNNY_MIGRATION_DB_TABLE: 'videos_migration_e2e_20261026',
        BUNNY_MIGRATION_ALLOW_TEST_TABLE: '1',
    });
    await repository.close();
});

test('migration lock prevents concurrent state writers and releases cleanly', async () => {
    const root = await mkdtemp(join(tmpdir(), 'azmigrantat-migration-lock-'));
    try {
        const path = join(root, 'migration.lock');
        const first = await MigrationLock.acquire(path);
        await assert.rejects(() => MigrationLock.acquire(path), /holds the migration lock/);
        await first.release();
        const second = await MigrationLock.acquire(path);
        await second.release();
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('immutable backup cannot be overwritten', async () => {
    const root = await mkdtemp(join(tmpdir(), 'azmigrantat-migration-backup-'));
    try {
        const path = join(root, 'backup.json');
        await writeJsonImmutable(path, { row: 78 });
        await assert.rejects(() => writeJsonImmutable(path, { row: 79 }), (error: NodeJS.ErrnoException) => error.code === 'EEXIST');
        assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), { row: 78 });
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

function productionRow(): Record<string, unknown> {
    return {
        id: 78, user_id: 1269, category_id: 60, bunny_library_id: 753007,
        bunny_video_guid: 'ba8a28ca-603b-4563-be47-3574a773d91d', provider: 'bunny',
        provider_video_id: 'ba8a28ca-603b-4563-be47-3574a773d91d', storage_path: null, playback_url: null,
        thumbnail_url: 'https://cdn.example/78.jpg', title: 'title', description: null,
        status: 'ready', processing_status: 'ready', bunny_status: 4, mime_type: 'video/mp4', file_size: 3837143,
        duration_seconds: null, duration: null, width: null, height: null, upload_expires_at: null,
        uploaded_at: '2026-10-09 13:53:10.000', processed_at: '2026-10-09 13:55:56.000',
        failed_at: null, failure_reason: null, created_at: '2026-10-09 13:53:05.000', updated_at: '2026-10-25 10:03:34.000',
        total_views: 242, unique_viewers: 3,
    };
}

test('transactional commit locks and conditionally updates only provider routing fields', async () => {
    const row = productionRow();
    const calls: Array<{ sql: string; args?: unknown[] }> = [];
    let began = false; let committed = false; let rolledBack = false; let released = false;
    const connection = {
        beginTransaction: async () => { began = true; }, commit: async () => { committed = true; },
        rollback: async () => { rolledBack = true; }, release: () => { released = true; },
        query: async (sql: string, args?: unknown[]) => {
            calls.push({ sql, args });
            return sql.startsWith('SELECT') ? [[row], []] : [{ affectedRows: 1 }, []];
        },
    };
    const repository = new MysqlVideoRepository({ getConnection: async () => connection } as never);
    let backup: Record<string, unknown> | undefined;
    const target = { videoId: 78, ownerId: 1269, libraryId: 753007, bunnyGuid: String(row.bunny_video_guid), rowSha256: rowFingerprint(row) };
    const patch = { providerVideoId: '11111111-1111-4111-8111-111111111111', storagePath: 'public/videos/78/111.mp4', playbackUrl: 'https://video.example/videos/78/111.mp4' };
    await repository.commitDedicated(target, patch, async (value) => { backup = value; });
    assert.equal(began && committed && released, true);
    assert.equal(rolledBack, false);
    assert.deepEqual(backup, row);
    const update = calls.find((call) => call.sql.startsWith('UPDATE'))?.sql || '';
    assert.match(update, /user_id = \?/);
    assert.match(update, /bunny_library_id = \?/);
    assert.match(update, /bunny_video_guid = \?/);
    assert.match(update, /provider = 'bunny'/);
    for (const forbidden of ['category_id', 'thumbnail_url', 'total_views', 'file_size', 'processed_at', 'updated_at']) assert.equal(update.includes(forbidden), false);
});

test('transactional commit rolls back when the reviewed row fingerprint changed', async () => {
    const reviewed = productionRow();
    const changed = { ...reviewed, total_views: 243 };
    let updated = false; let rolledBack = false;
    const connection = {
        beginTransaction: async () => {}, commit: async () => {}, rollback: async () => { rolledBack = true; }, release: () => {},
        query: async (sql: string) => {
            if (sql.startsWith('SELECT')) return [[changed], []];
            updated = true; return [{ affectedRows: 1 }, []];
        },
    };
    const repository = new MysqlVideoRepository({ getConnection: async () => connection } as never);
    const target = { videoId: 78, ownerId: 1269, libraryId: 753007, bunnyGuid: String(reviewed.bunny_video_guid), rowSha256: rowFingerprint(reviewed) };
    await assert.rejects(() => repository.commitDedicated(target, { providerVideoId: 'dedicated', storagePath: 'path', playbackUrl: 'https://video.example/78.mp4' }, async () => {}), /changed after/);
    assert.equal(updated, false);
    assert.equal(rolledBack, true);
});

test('rollback is conditional on the exact committed routing tuple and restores only that tuple', async () => {
    const backup = productionRow();
    const patch = { providerVideoId: '11111111-1111-4111-8111-111111111111', storagePath: 'public/videos/78/111.mp4', playbackUrl: 'https://video.example/videos/78/111.mp4' };
    const current = { ...backup, provider: 'oneprovider', provider_video_id: patch.providerVideoId, storage_path: patch.storagePath, playback_url: patch.playbackUrl };
    const calls: string[] = [];
    const connection = {
        beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
        query: async (sql: string) => { calls.push(sql); return sql.startsWith('SELECT') ? [[current], []] : [{ affectedRows: 1 }, []]; },
    };
    const repository = new MysqlVideoRepository({ getConnection: async () => connection } as never);
    const target = { videoId: 78, ownerId: 1269, libraryId: 753007, bunnyGuid: String(backup.bunny_video_guid), rowSha256: rowFingerprint(backup) };
    await repository.rollbackDedicated(target, patch, backup);
    const update = calls.find((sql) => sql.startsWith('UPDATE')) || '';
    assert.match(update, /provider = \?/);
    assert.match(update, /provider_video_id = \?/);
    assert.match(update, /provider = 'oneprovider'/);
    assert.equal(update.includes('title'), false);
    assert.equal(update.includes('total_views'), false);
});
