import { createHash, createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { appendFile, mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { FfmpegProcessor, chooseProcessingMode, hasFaststartFromBuffer } from './processing';
import { loadConfig, type VideoServiceConfig } from './config';
import { UploadStore } from './store';
import type { ProcessingJob, ProbeResult } from './types';

type BunnyVideo = {
    guid: string;
    title?: string;
    description?: string | null;
    views?: number;
    storageSize?: number;
    length?: number;
    status?: number;
    width?: number;
    height?: number;
    hasOriginal?: boolean;
    originalHash?: string | null;
    hasMP4Fallback?: boolean;
    thumbnailFileName?: string | null;
};

type LegacyVideo = {
    id: number;
    user_id: number;
    bunny_library_id: number;
    bunny_video_guid: string;
    file_size: number | null;
    mime_type: string | null;
    status: string;
    category_id?: number | null;
    title?: string | null;
    description?: string | null;
    thumbnail_url?: string | null;
    total_views?: number | null;
    unique_viewers?: number | null;
};

type MigrationEntry = {
    bunnyGuid: string;
    videoId: number;
    dedicatedId: string;
    status: 'planned' | 'downloaded' | 'verified' | 'commit_pending' | 'committed' | 'rolled_back' | 'failed';
    sourceUrl?: string;
    sourceKind?: 'original' | 'mp4' | 'hls';
    localPath?: string;
    playbackUrl?: string;
    thumbnailUrl?: string;
    bytes?: number;
    sha256?: string;
    probe?: ProbeResult;
    thumbnailPreserved?: boolean;
    ownerUserId?: number;
    categoryId?: number | null;
    title?: string | null;
    description?: string | null;
    totalViews?: number | null;
    uniqueViewers?: number | null;
    planSha256?: string;
    rowSha256?: string;
    backupPath?: string;
    backupSha256?: string;
    publishedVideoSha256?: string;
    publishedThumbnailSha256?: string;
    error?: string;
    updatedAt: string;
};

type MigrationState = {
    version: 1;
    entries: Record<string, MigrationEntry>;
};

const ROW_FINGERPRINT_FIELDS = [
    'id', 'user_id', 'category_id', 'bunny_library_id', 'bunny_video_guid', 'provider', 'provider_video_id',
    'storage_path', 'playback_url', 'thumbnail_url', 'title', 'description', 'status', 'processing_status',
    'bunny_status', 'mime_type', 'file_size', 'duration_seconds', 'duration', 'width', 'height',
    'upload_expires_at', 'uploaded_at', 'processed_at', 'failed_at', 'failure_reason', 'created_at', 'updated_at',
    'total_views', 'unique_viewers',
] as const;

export function rowFingerprint(row: Record<string, unknown>): string {
    const normalized = Object.fromEntries(ROW_FINGERPRINT_FIELDS.map((field) => [field, row[field] ?? null]));
    return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

function assertExactTarget(row: Record<string, unknown>, target: MigrationTarget, context: string): void {
    if (Number(row.id) !== target.videoId || Number(row.user_id) !== target.ownerId
        || Number(row.bunny_library_id) !== target.libraryId || row.bunny_video_guid !== target.bunnyGuid
        || row.provider !== 'bunny') {
        throw new Error(`Video identity/provider mismatch during ${context}.`);
    }
}

export type MigrationOptions = {
    dryRun: boolean;
    execute: boolean;
    commit: boolean;
    confirmCommit: boolean;
    resume: boolean;
    limit?: number;
    videoId?: number;
    guid?: string;
    ownerId?: number;
    allowMultiple?: boolean;
    rollback?: boolean;
    confirmRollback?: boolean;
    retries: number;
};

type MigrationTarget = {
    videoId: number;
    ownerId: number;
    libraryId: number;
    bunnyGuid: string;
    rowSha256: string;
};

type DedicatedPatch = {
    providerVideoId: string;
    storagePath: string;
    playbackUrl: string;
};

export interface VideoRepository {
    listLegacyVideos(libraryId: number): Promise<LegacyVideo[]>;
    snapshotVideos(videoIds: number[]): Promise<Record<string, unknown>[]>;
    commitDedicated(target: MigrationTarget, patch: DedicatedPatch, writeBackup: (row: Record<string, unknown>) => Promise<void>): Promise<void>;
    rollbackDedicated(target: MigrationTarget, patch: DedicatedPatch, backupRow: Record<string, unknown>): Promise<void>;
    verifyDedicated(target: MigrationTarget, patch: DedicatedPatch): Promise<boolean>;
    close(): Promise<void>;
}

export class MysqlVideoRepository implements VideoRepository {
    private boundaryCheck?: Promise<void>;

    constructor(
        private readonly pool: Pool,
        private readonly table = 'videos',
        private readonly expectedDatabase?: string,
    ) {
        if (table !== 'videos' && !/^videos_migration_e2e_[a-z0-9_]{6,48}$/.test(table)) {
            throw new Error('Migration database table is outside the allowlisted boundary.');
        }
    }

    private quotedTable(): string { return `\`${this.table}\``; }

    private async assertDatabaseBoundary(): Promise<void> {
        if (!this.expectedDatabase) return;
        this.boundaryCheck ||= (async () => {
            const [rows] = await this.pool.query<RowDataPacket[]>('SELECT DATABASE() AS database_name');
            if (rows.length !== 1 || rows[0].database_name !== this.expectedDatabase) {
                throw new Error('Connected database does not match BUNNY_MIGRATION_EXPECTED_DB_NAME.');
            }
        })();
        await this.boundaryCheck;
    }

    async listLegacyVideos(libraryId: number): Promise<LegacyVideo[]> {
        await this.assertDatabaseBoundary();
        let rows: (LegacyVideo & RowDataPacket)[];
        try {
            [rows] = await this.pool.query<(LegacyVideo & RowDataPacket)[]>(
                `SELECT * FROM ${this.quotedTable()}
                 WHERE bunny_library_id = ?
                   AND bunny_video_guid IS NOT NULL
                   AND bunny_video_guid <> ''
                   AND (provider IS NULL OR provider = '' OR provider = 'bunny')
                 ORDER BY id ASC`,
                [libraryId],
            );
        } catch (error) {
            // Production may still be on the legacy schema during the
            // read-only preparation phase. Inventory remains safe; commit is
            // deliberately left impossible until the provider-neutral schema
            // migration is applied and verified separately.
            if ((error as { code?: string }).code !== 'ER_BAD_FIELD_ERROR') throw error;
            [rows] = await this.pool.query<(LegacyVideo & RowDataPacket)[]>(
                `SELECT * FROM ${this.quotedTable()}
                 WHERE bunny_library_id = ?
                   AND bunny_video_guid IS NOT NULL
                   AND bunny_video_guid <> ''
                 ORDER BY id ASC`,
                [libraryId],
            );
        }
        return rows.map((row) => ({ ...row, id: Number(row.id), user_id: Number(row.user_id), bunny_library_id: Number(row.bunny_library_id), file_size: row.file_size === null ? null : Number(row.file_size), category_id: row.category_id === null || row.category_id === undefined ? null : Number(row.category_id), total_views: row.total_views === null || row.total_views === undefined ? null : Number(row.total_views), unique_viewers: row.unique_viewers === null || row.unique_viewers === undefined ? null : Number(row.unique_viewers) }));
    }

    async snapshotVideos(videoIds: number[]): Promise<Record<string, unknown>[]> {
        await this.assertDatabaseBoundary();
        if (videoIds.length === 0) return [];
        const placeholders = videoIds.map(() => '?').join(',');
        const [rows] = await this.pool.query<RowDataPacket[]>(`SELECT * FROM ${this.quotedTable()} WHERE id IN (${placeholders}) ORDER BY id ASC`, videoIds);
        return rows.map((row) => ({ ...row }));
    }

    async commitDedicated(target: MigrationTarget, patch: DedicatedPatch, writeBackup: (row: Record<string, unknown>) => Promise<void>): Promise<void> {
        await this.assertDatabaseBoundary();
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${this.quotedTable()} WHERE id = ? FOR UPDATE`, [target.videoId]);
            if (rows.length !== 1) throw new Error(`Video ${target.videoId} is missing during commit.`);
            const current = { ...rows[0] };
            assertExactTarget(current, target, 'commit');
            if (rowFingerprint(current) !== target.rowSha256) throw new Error(`Video ${target.videoId} changed after the reviewed dry-run.`);
            await writeBackup(current);
            const [result] = await connection.query<ResultSetHeader>(
                `UPDATE ${this.quotedTable()}
                 SET provider = 'oneprovider', provider_video_id = ?, storage_path = ?, playback_url = ?
                 WHERE id = ? AND user_id = ? AND bunny_library_id = ? AND bunny_video_guid = ?
                   AND provider = 'bunny'`,
                [patch.providerVideoId, patch.storagePath, patch.playbackUrl, target.videoId, target.ownerId, target.libraryId, target.bunnyGuid],
            );
            if (result.affectedRows !== 1) throw new Error(`Video ${target.videoId} failed the conditional commit.`);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async rollbackDedicated(target: MigrationTarget, patch: DedicatedPatch, backupRow: Record<string, unknown>): Promise<void> {
        await this.assertDatabaseBoundary();
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${this.quotedTable()} WHERE id = ? FOR UPDATE`, [target.videoId]);
            if (rows.length !== 1) throw new Error(`Video ${target.videoId} is missing during rollback.`);
            const current = rows[0];
            if (Number(current.user_id) !== target.ownerId || Number(current.bunny_library_id) !== target.libraryId || current.bunny_video_guid !== target.bunnyGuid
                || current.provider !== 'oneprovider' || current.provider_video_id !== patch.providerVideoId
                || current.storage_path !== patch.storagePath || current.playback_url !== patch.playbackUrl) {
                throw new Error(`Video ${target.videoId} no longer matches the committed migration; rollback refused.`);
            }
            assertExactTarget(backupRow, target, 'backup');
            if (rowFingerprint(backupRow) !== target.rowSha256) throw new Error('Rollback backup does not match the reviewed row fingerprint.');
            const [result] = await connection.query<ResultSetHeader>(
                `UPDATE ${this.quotedTable()} SET provider = ?, provider_video_id = ?, storage_path = ?, playback_url = ?
                 WHERE id = ? AND user_id = ? AND bunny_library_id = ? AND bunny_video_guid = ?
                   AND provider = 'oneprovider' AND provider_video_id = ? AND storage_path = ? AND playback_url = ?`,
                [backupRow.provider, backupRow.provider_video_id, backupRow.storage_path, backupRow.playback_url,
                    target.videoId, target.ownerId, target.libraryId, target.bunnyGuid,
                    patch.providerVideoId, patch.storagePath, patch.playbackUrl],
            );
            if (result.affectedRows !== 1) throw new Error(`Video ${target.videoId} failed the conditional rollback.`);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async verifyDedicated(target: MigrationTarget, patch: DedicatedPatch): Promise<boolean> {
        await this.assertDatabaseBoundary();
        const [rows] = await this.pool.query<RowDataPacket[]>(
            `SELECT id FROM ${this.quotedTable()} WHERE id = ? AND user_id = ? AND bunny_library_id = ? AND bunny_video_guid = ?
               AND provider = 'oneprovider' AND provider_video_id = ? AND storage_path = ? AND playback_url = ?`,
            [target.videoId, target.ownerId, target.libraryId, target.bunnyGuid, patch.providerVideoId, patch.storagePath, patch.playbackUrl],
        );
        return rows.length === 1;
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}

export function createMysqlRepository(env: NodeJS.ProcessEnv = process.env): MysqlVideoRepository {
    const table = env.BUNNY_MIGRATION_DB_TABLE?.trim() || 'videos';
    if (table !== 'videos' && env.BUNNY_MIGRATION_ALLOW_TEST_TABLE !== '1') {
        throw new Error('A non-production migration table requires BUNNY_MIGRATION_ALLOW_TEST_TABLE=1.');
    }
    const pool = mysql.createPool({
        host: env.BUNNY_MIGRATION_DB_HOST || '127.0.0.1',
        port: Number(env.BUNNY_MIGRATION_DB_PORT || 3306),
        database: env.BUNNY_MIGRATION_DB_NAME,
        user: env.BUNNY_MIGRATION_DB_USER,
        password: env.BUNNY_MIGRATION_DB_PASSWORD,
        connectionLimit: 2,
        enableKeepAlive: true,
    });
    return new MysqlVideoRepository(pool, table, env.BUNNY_MIGRATION_EXPECTED_DB_NAME?.trim() || undefined);
}

export class BunnyApiClient {
    private readonly base = 'https://video.bunnycdn.com';
    constructor(private readonly libraryId: number, private readonly apiKey: string, private readonly env: NodeJS.ProcessEnv = process.env) {
        if (!Number.isSafeInteger(libraryId) || libraryId < 1 || !apiKey) throw new Error('Bunny library/API credentials are required.');
    }

    async listVideos(): Promise<BunnyVideo[]> {
        const result: BunnyVideo[] = [];
        const pageSize = 100;
        for (let page = 1; ; page += 1) {
            const url = `${this.base}/library/${this.libraryId}/videos?page=${page}&itemsPerPage=${pageSize}&orderBy=date`;
            const payload = await this.requestJson(url);
            const items = Array.isArray(payload) ? payload : (payload.items || payload.Items || []);
            if (!Array.isArray(items)) throw new Error('Unexpected Bunny video list response.');
            result.push(...items.filter((item): item is BunnyVideo => typeof item?.guid === 'string'));
            if (items.length < pageSize) return result;
        }
    }

    async resolveSource(guid: string, remote?: BunnyVideo): Promise<{ url: string; kind: 'original' | 'mp4' | 'hls' } | null> {
        const candidates: Array<{ url: string; kind: 'original' | 'mp4' | 'hls' }> = [];
        const originalTemplate = this.env.BUNNY_ORIGINAL_URL_TEMPLATE?.trim();
        const mp4Template = this.env.BUNNY_MP4_URL_TEMPLATE?.trim();
        // An explicit operator-supplied template may point at an account
        // export endpoint even when the current API flags say the original is
        // unavailable. The unconfigured Bunny API download endpoint is gated
        // by hasOriginal to avoid guessing at a non-existent source.
        if (originalTemplate) candidates.push({ url: expandTemplate(originalTemplate, this.libraryId, guid), kind: 'original' });
        if (remote?.hasOriginal !== false) {
            candidates.push({ url: `${this.base}/library/${this.libraryId}/videos/${encodeURIComponent(guid)}/download`, kind: 'original' });
        }
        if (mp4Template) candidates.push({ url: expandTemplate(mp4Template, this.libraryId, guid), kind: 'mp4' });
        const hlsTemplate = this.env.BUNNY_HLS_URL_TEMPLATE?.trim();
        if (hlsTemplate) {
            candidates.push({ url: expandTemplate(hlsTemplate, this.libraryId, guid), kind: 'hls' });
        } else {
            const host = this.env.BUNNY_STREAM_CDN_HOST_NAME?.trim();
            const tokenKey = this.env.BUNNY_STREAM_TOKEN_SECURITY_KEY?.trim();
            if (host && tokenKey) {
                const path = `/${guid}/`;
                const expires = Math.floor(Date.now() / 1000) + 900;
                const digest = createHmac('sha256', tokenKey).update(path + expires + `token_path=${path}`).digest('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
                candidates.push({ url: `https://${host}/bcdn_token=HS256-${digest}&token_path=${encodeURIComponent(path)}&expires=${expires}/${guid}/playlist.m3u8`, kind: 'hls' });
            }
        }
        for (const candidate of candidates) {
            if (candidate.kind === 'hls') validateHlsUrl(candidate.url, this.env.BUNNY_STREAM_CDN_HOST_NAME?.trim() || '', guid);
            const resolved = await this.resolveCandidate(candidate);
            if (resolved) {
                if (resolved.kind === 'hls') validateHlsUrl(resolved.url, this.env.BUNNY_STREAM_CDN_HOST_NAME?.trim() || '', guid);
                return resolved;
            }
        }
        return null;
    }

    private async resolveCandidate(candidate: { url: string; kind: 'original' | 'mp4' | 'hls' }): Promise<{ url: string; kind: 'original' | 'mp4' | 'hls' } | null> {
        const response = await fetch(candidate.url, { method: 'HEAD', headers: this.headersForUrl(candidate.url), signal: AbortSignal.timeout(15_000), redirect: 'error' });
        if (candidate.kind === 'hls' && response.url !== candidate.url) {
            const expectedHost = this.env.BUNNY_STREAM_CDN_HOST_NAME?.trim() || '';
            const guid = new URL(candidate.url).pathname.match(/[a-f0-9-]{36}/i)?.[0] || '';
            validateHlsUrl(response.url, expectedHost, guid);
        }
        if (response.ok && isVideoResponse(response.headers.get('content-type'))) return candidate;
        if (response.ok && candidate.kind === 'hls' && isHlsResponse(response.headers.get('content-type'))) return candidate;
        if (candidate.kind !== 'original') return null;
        const jsonResponse = await fetch(candidate.url, { headers: this.headersForUrl(candidate.url), signal: AbortSignal.timeout(15_000), redirect: 'error' });
        if (!jsonResponse.ok) return null;
        const contentType = jsonResponse.headers.get('content-type') || '';
        if (isVideoResponse(contentType)) return { url: jsonResponse.url, kind: candidate.kind };
        if (!contentType.includes('json')) return null;
        const payload = await jsonResponse.json() as Record<string, unknown>;
        const url = [payload.url, payload.downloadUrl, payload.download_url, payload.videoUrl].find((value): value is string => typeof value === 'string' && /^https?:\/\//.test(value));
        return url ? { url, kind: candidate.kind } : null;
    }

    async download(url: string, destination: string, retries: number): Promise<{ bytes: number; sha256: string }> {
        await mkdir(dirname(destination), { recursive: true, mode: 0o750 });
        const partial = `${destination}.part`;
        for (let attempt = 0; attempt <= retries; attempt += 1) {
            try {
                const existing = await fileSizeOrZero(partial);
                const headers: Record<string, string> = { ...this.headersForUrl(url) };
                if (existing > 0) headers.Range = `bytes=${existing}-`;
                const response = await fetch(url, { headers });
                if (!response.ok && response.status !== 206) throw new Error(`Bunny download HTTP ${response.status}.`);
                const range = response.headers.get('content-range');
                const append = existing > 0 && response.status === 206 && Boolean(range && range.startsWith(`bytes ${existing}-`));
                const start = append ? existing : 0;
                if (!response.body) throw new Error('Bunny download returned no body.');
                const handle = await open(partial, append ? 'a' : 'w', 0o640);
                try {
                    await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), handle.createWriteStream({ start }));
                } finally {
                    await handle.close();
                }
                const bytes = await fileSizeOrZero(partial);
                if (bytes < 1) throw new Error('Downloaded file is empty.');
                await rename(partial, destination);
                return { bytes, sha256: await sha256(destination) };
            } catch (error) {
                if (attempt >= retries) throw error;
                await delay(1000 * 2 ** attempt);
            }
        }
        throw new Error('Unreachable download retry state.');
    }

    private headers(): Record<string, string> {
        return { AccessKey: this.apiKey, Accept: 'application/json, video/*, application/octet-stream' };
    }

    private headersForUrl(url: string): Record<string, string> {
        try {
            return new URL(url).hostname === new URL(this.base).hostname
                ? this.headers()
                : { Accept: 'application/json, video/*, application/octet-stream' };
        } catch {
            return { Accept: 'application/json, video/*, application/octet-stream' };
        }
    }

    private async requestJson(url: string): Promise<any> {
        const response = await fetch(url, { headers: this.headers() });
        if (!response.ok) throw new Error(`Bunny API HTTP ${response.status}.`);
        return response.json();
    }
}

export class MigrationStateStore {
    constructor(private readonly path: string) {}
    async load(): Promise<MigrationState> {
        try { return JSON.parse(await readFile(this.path, 'utf8')) as MigrationState; }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; return { version: 1, entries: {} }; }
    }
    async save(state: MigrationState): Promise<void> {
        await mkdir(dirname(this.path), { recursive: true, mode: 0o750 });
        const temporary = `${this.path}.${randomUUID()}.tmp`;
        await writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o640 });
        await rename(temporary, this.path);
    }
}

export class MigrationLock {
    private constructor(private readonly path: string, private readonly handle: Awaited<ReturnType<typeof open>>) {}
    static async acquire(path: string): Promise<MigrationLock> {
        await mkdir(dirname(path), { recursive: true, mode: 0o750 });
        try {
            const handle = await open(path, 'wx', 0o640);
            await handle.writeFile(JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }));
            return new MigrationLock(path, handle);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Another Bunny migration process holds the migration lock.');
            throw error;
        }
    }
    async release(): Promise<void> {
        try { await this.handle.close(); }
        finally { await rm(this.path, { force: true }); }
    }
}

export class MigrationLogger {
    constructor(private readonly path: string) {}
    async event(event: string, data: Record<string, unknown> = {}): Promise<void> {
        await mkdir(dirname(this.path), { recursive: true, mode: 0o750 });
        await appendFile(this.path, `${JSON.stringify({ at: new Date().toISOString(), event, ...data })}\n`, { mode: 0o640 });
    }
}

export function validateSingleTargetOptions(options: MigrationOptions): asserts options is MigrationOptions & { videoId: number; ownerId: number; guid: string } {
    if (!Number.isSafeInteger(options.videoId) || Number(options.videoId) < 1
        || !Number.isSafeInteger(options.ownerId) || Number(options.ownerId) < 1
        || !options.guid || !/^[a-f0-9-]{36}$/i.test(options.guid)) {
        throw new Error('Migration requires one explicit --video-id, --owner-id and --guid target.');
    }
}

function planFingerprint(libraryId: number, video: LegacyVideo, remote: BunnyVideo): string {
    return createHash('sha256').update(JSON.stringify({
        libraryId,
        rowSha256: rowFingerprint(video as unknown as Record<string, unknown>),
        remote: {
            guid: remote.guid, storageSize: remote.storageSize ?? null, length: remote.length ?? null,
            status: remote.status ?? null, width: remote.width ?? null, height: remote.height ?? null,
            hasOriginal: remote.hasOriginal ?? null, originalHash: remote.originalHash ?? null,
        },
    })).digest('hex');
}

export async function runBunnyMigration(options: MigrationOptions, env: NodeJS.ProcessEnv = process.env, repository?: VideoRepository): Promise<{ planned: number; verified: number; committed: number; failed: number }> {
    if (options.commit && (!options.execute || !options.confirmCommit)) throw new Error('--commit requires --execute --confirm-commit.');
    if (options.rollback && (!options.confirmRollback || options.execute || options.commit)) throw new Error('--rollback requires --confirm-rollback and cannot be combined with execute/commit.');
    validateSingleTargetOptions(options);
    const config = loadConfig(env);
    const libraryId = Number(env.BUNNY_STREAM_LIBRARY_ID || 0);
    const apiKey = env.BUNNY_STREAM_API_KEY?.trim() || '';
    const bunny = new BunnyApiClient(libraryId, apiKey, env);
    const store = new UploadStore(config.root);
    await store.init();
    const db = repository || createMysqlRepository(env);
    const statePath = env.BUNNY_MIGRATION_STATE_FILE || join(config.root, 'state', 'bunny-migration.json');
    const stateStore = new MigrationStateStore(statePath);
    const backupBasePath = env.BUNNY_MIGRATION_BACKUP_FILE || join(config.root, 'state', 'bunny-migration-backup.json');
    const inventoryPath = env.BUNNY_MIGRATION_INVENTORY_FILE || join(config.root, 'state', 'bunny-migration-inventory.json');
    const mappingPath = env.BUNNY_MIGRATION_MAPPING_FILE || join(config.root, 'state', 'bunny-migration-mapping.json');
    const logger = new MigrationLogger(env.BUNNY_MIGRATION_LOG_FILE || join(config.root, 'logs', 'bunny-migration.jsonl'));
    const lock = await MigrationLock.acquire(env.BUNNY_MIGRATION_LOCK_FILE || `${statePath}.lock`);
    const result = { planned: 0, verified: 0, committed: 0, failed: 0 };
    try {
        const state = await stateStore.load();
        const key = `${libraryId}:${options.guid}`;
        const previous = state.entries[key];
        const target: MigrationTarget = { videoId: options.videoId, ownerId: options.ownerId, libraryId, bunnyGuid: options.guid, rowSha256: previous?.rowSha256 || '' };
        const patchFor = (entry: MigrationEntry): DedicatedPatch => ({
            providerVideoId: entry.dedicatedId,
            storagePath: `public/videos/${entry.videoId}/${entry.dedicatedId}.mp4`,
            playbackUrl: entry.playbackUrl || '',
        });

        if (previous && (previous.videoId !== options.videoId || previous.ownerUserId !== options.ownerId || previous.bunnyGuid !== options.guid)) {
            throw new Error('Stored migration state does not match the explicit video/owner/GUID target.');
        }

        if (options.rollback) {
            if (!previous || !['commit_pending', 'committed'].includes(previous.status) || !previous.backupPath || !previous.backupSha256 || !previous.rowSha256 || !previous.playbackUrl) {
                throw new Error('A committed state with an immutable verified backup is required for rollback.');
            }
            if (await sha256(previous.backupPath) !== previous.backupSha256) throw new Error('Rollback backup SHA-256 mismatch.');
            const backup = JSON.parse(await readFile(previous.backupPath, 'utf8')) as { rows?: Record<string, unknown>[] };
            if (!Array.isArray(backup.rows) || backup.rows.length !== 1) throw new Error('Rollback backup must contain exactly one row.');
            await db.rollbackDedicated({ ...target, rowSha256: previous.rowSha256 }, patchFor(previous), backup.rows[0]);
            state.entries[key] = { ...previous, status: 'rolled_back', updatedAt: new Date().toISOString() };
            await stateStore.save(state);
            await saveRollbackMapping(mappingPath, state);
            await logger.event('rolled_back', { videoId: options.videoId, bunnyGuid: options.guid, dedicatedId: previous.dedicatedId });
            return result;
        }

        if (previous && ['commit_pending', 'committed'].includes(previous.status)) {
            if (!previous.rowSha256 || !previous.playbackUrl || !previous.publishedVideoSha256 || !previous.publishedThumbnailSha256) throw new Error('Committed state is incomplete and cannot be reconciled.');
            const committedTarget = { ...target, rowSha256: previous.rowSha256 };
            if (!await db.verifyDedicated(committedTarget, patchFor(previous))) throw new Error('Committed state does not match the current database routing tuple.');
            const publicVideo = safeJoin(config.root, 'public', 'videos', String(previous.videoId), `${previous.dedicatedId}.mp4`);
            const publicThumbnail = safeJoin(config.root, 'public', 'thumbnails', String(previous.videoId), `${previous.dedicatedId}.jpg`);
            if (await sha256(publicVideo) !== previous.publishedVideoSha256 || await sha256(publicThumbnail) !== previous.publishedThumbnailSha256) {
                throw new Error('Committed published artifacts do not match their persisted SHA-256 values.');
            }
            await verifyRange(previous.playbackUrl, env.VIDEO_SERVICE_PUBLIC_URL || '');
            await verifyThumbnail(expandThumbnailUrl(env, previous.videoId, previous.dedicatedId), env.VIDEO_SERVICE_PUBLIC_URL || '');
            if (previous.status !== 'committed') {
                state.entries[key] = { ...previous, status: 'committed', updatedAt: new Date().toISOString() };
                await stateStore.save(state); await saveRollbackMapping(mappingPath, state);
            }
            result.planned = 1; result.verified = 1; result.committed = 1; return result;
        }

        const legacy = await db.listLegacyVideos(libraryId);
        const selected = legacy.filter((video) => video.id === options.videoId && video.user_id === options.ownerId && video.bunny_video_guid === options.guid);
        if (selected.length !== 1) throw new Error('The explicit migration target did not resolve to exactly one Bunny database row.');
        const video = selected[0];
        const bunnyVideos = await bunny.listVideos();
        const remote = bunnyVideos.find((item) => item.guid === options.guid);
        if (!remote) throw new Error('The explicit Bunny GUID is missing from the configured library.');
        const rowSha256 = rowFingerprint(video as unknown as Record<string, unknown>);
        const planSha256 = planFingerprint(libraryId, video, remote);
        if (previous && (previous.videoId !== options.videoId || previous.ownerUserId !== options.ownerId || previous.bunnyGuid !== options.guid
            || previous.rowSha256 !== rowSha256 || previous.planSha256 !== planSha256)) {
            throw new Error('Existing migration state does not match the current explicit target/metadata plan.');
        }
        const dedicatedId = previous?.dedicatedId || randomUUID();
        result.planned = 1;
        await writeJsonAtomic(inventoryPath, {
            generated_at: new Date().toISOString(), bunny_library_id: libraryId, total_videos: 1,
            total_source_bytes: video.file_size || 0, total_bunny_storage_bytes: remote.storageSize || 0,
            videos: [{ php_video_id: video.id, owner_user_id: video.user_id, category_id: video.category_id ?? null,
                title: video.title ?? null, description: video.description ?? null, thumbnail_url: video.thumbnail_url ?? null,
                status: video.status, total_views: video.total_views ?? null, unique_viewers: video.unique_viewers ?? null,
                bunny_video_guid: video.bunny_video_guid, bunny: remote }],
        });
        const planned: MigrationEntry = previous || {
            bunnyGuid: video.bunny_video_guid, videoId: video.id, dedicatedId, status: 'planned', ownerUserId: video.user_id,
            categoryId: video.category_id ?? null, title: video.title ?? null, description: video.description ?? null,
            totalViews: video.total_views ?? null, uniqueViewers: video.unique_viewers ?? null, planSha256, rowSha256,
            updatedAt: new Date().toISOString(),
        };
        if (options.dryRun) {
            if (previous && previous.status !== 'planned' && previous.status !== 'failed') throw new Error('Dry-run refuses to overwrite progressed migration state.');
            state.entries[key] = { ...planned, status: 'planned', error: undefined, updatedAt: new Date().toISOString() };
            await stateStore.save(state); await saveRollbackMapping(mappingPath, state);
            await logger.event('planned', { videoId: video.id, bunnyGuid: video.bunny_video_guid, dedicatedId, remoteSize: remote.storageSize || null, planSha256 });
            return result;
        }
        if (!previous || previous.planSha256 !== planSha256 || previous.rowSha256 !== rowSha256) {
            throw new Error('Execute requires a matching reviewed dry-run state.');
        }

        let dbCommitted = false;
        const commitVerified = async (entry: MigrationEntry): Promise<void> => {
            const targetWithHash = { ...target, rowSha256 };
            const routing = patchFor(entry);
            await db.commitDedicated(targetWithHash, routing, async (row) => {
                const uniqueBackup = `${backupBasePath}.${video.id}.${Date.now()}.${randomUUID()}.json`;
                await writeJsonImmutable(uniqueBackup, { generated_at: new Date().toISOString(), purpose: 'bunny-to-oneprovider-transaction-backup', video_ids: [video.id], rows: [row] });
                const backupSha256 = await sha256(uniqueBackup);
                state.entries[key] = { ...state.entries[key], status: 'commit_pending', backupPath: uniqueBackup, backupSha256, updatedAt: new Date().toISOString() };
                await stateStore.save(state);
                await logger.event('database_backup_created', { path: uniqueBackup, rows: 1, sha256: backupSha256 });
            });
            dbCommitted = true;
            state.entries[key] = { ...state.entries[key], status: 'committed', updatedAt: new Date().toISOString() };
            await stateStore.save(state); await saveRollbackMapping(mappingPath, state);
            result.committed = 1;
            await logger.event('committed', { videoId: video.id, bunnyGuid: video.bunny_video_guid, dedicatedId });
        };

        if (previous.status === 'verified') {
            if (!previous.publishedVideoSha256 || !previous.publishedThumbnailSha256 || !previous.playbackUrl) throw new Error('Verified state lacks published artifact hashes.');
            const publicVideo = safeJoin(config.root, 'public', 'videos', String(video.id), `${dedicatedId}.mp4`);
            const publicThumbnail = safeJoin(config.root, 'public', 'thumbnails', String(video.id), `${dedicatedId}.jpg`);
            if (await sha256(publicVideo) !== previous.publishedVideoSha256 || await sha256(publicThumbnail) !== previous.publishedThumbnailSha256) {
                throw new Error('Verified published artifacts changed; refusing to overwrite them on resume.');
            }
            await verifyRange(previous.playbackUrl, env.VIDEO_SERVICE_PUBLIC_URL || '');
            await verifyThumbnail(expandThumbnailUrl(env, video.id, dedicatedId), env.VIDEO_SERVICE_PUBLIC_URL || '');
            result.verified = 1;
            if (options.commit) await commitVerified(previous);
            return result;
        }

        try {
            const source = await bunny.resolveSource(video.bunny_video_guid, remote);
            if (!source) throw new Error('No configured migration source is available.');
            if (env.BUNNY_MIGRATION_REQUIRE_HLS === '1' && source.kind !== 'hls') throw new Error('This migration requires the signed Bunny HLS source.');
            const destination = safeJoin(env.BUNNY_MIGRATION_DOWNLOAD_ROOT || join(config.root, 'private', 'migrations', 'bunny'), String(video.id), `${video.bunny_video_guid}.input`);
            const downloaded = source.kind === 'hls'
                ? await downloadHls(config.ffmpegBin, source.url, destination, options.retries, config.processTimeoutSeconds * 1000, env.BUNNY_STREAM_CDN_HOST_NAME || '', video.bunny_video_guid)
                : await bunny.download(source.url, destination, options.retries);
            if (source.kind === 'original' && remote.originalHash && downloaded.sha256.toLowerCase() !== remote.originalHash.toLowerCase()) throw new Error('Downloaded original SHA-256 does not match Bunny originalHash.');
            state.entries[key] = { ...planned, status: 'downloaded', sourceUrl: redactUrl(source.url), sourceKind: source.kind, localPath: destination, bytes: downloaded.bytes, sha256: downloaded.sha256, updatedAt: new Date().toISOString() };
            await stateStore.save(state); await saveRollbackMapping(mappingPath, state);
            const processed = await processMigratedFile(config, store, video, destination, dedicatedId, source.kind);
            if (source.kind === 'hls' && processed.videoSha256 !== downloaded.sha256) throw new Error('Published HLS copy-remux hash differs from the downloaded remux.');
            const playbackUrl = expandPublicUrl(env, video.id, dedicatedId);
            const generatedThumbnailUrl = expandThumbnailUrl(env, video.id, dedicatedId);
            await verifyRange(playbackUrl, env.VIDEO_SERVICE_PUBLIC_URL || '');
            await verifyThumbnail(generatedThumbnailUrl, env.VIDEO_SERVICE_PUBLIC_URL || '');
            state.entries[key] = { ...state.entries[key], status: 'verified', playbackUrl,
                thumbnailUrl: video.thumbnail_url || generatedThumbnailUrl, thumbnailPreserved: Boolean(video.thumbnail_url),
                probe: processed.probe, publishedVideoSha256: processed.videoSha256,
                publishedThumbnailSha256: processed.thumbnailSha256, updatedAt: new Date().toISOString() };
            await stateStore.save(state); await saveRollbackMapping(mappingPath, state);
            result.verified = 1;
            await logger.event('verified', { videoId: video.id, bunnyGuid: video.bunny_video_guid, dedicatedId,
                mode: processed.mode, bytes: downloaded.bytes, sha256: processed.videoSha256, thumbnailSha256: processed.thumbnailSha256 });
            if (options.commit) {
                await commitVerified(state.entries[key]);
            }
        } catch (error) {
            const message = sanitizeErrorMessage(error instanceof Error ? error.message : 'migration failed');
            if (dbCommitted || state.entries[key].status === 'commit_pending') throw new Error(`Database commit may have succeeded; preserved commit-pending state: ${message}`);
            const retainedStatus = state.entries[key].status === 'verified' ? 'verified' : 'failed';
            state.entries[key] = { ...state.entries[key], status: retainedStatus, error: message, updatedAt: new Date().toISOString() };
            await stateStore.save(state); await saveRollbackMapping(mappingPath, state);
            await logger.event('failed', { videoId: video.id, bunnyGuid: video.bunny_video_guid, dedicatedId, message });
            result.failed = 1;
        }
    } finally {
        try { await db.close(); }
        finally { await lock.release(); }
    }
    return result;
}

async function processMigratedFile(config: VideoServiceConfig, store: UploadStore, video: LegacyVideo, sourcePath: string, dedicatedId: string, sourceKind: 'original' | 'mp4' | 'hls'): Promise<{ mode: string; probe: ProbeResult; videoSha256: string; thumbnailSha256: string }> {
    const processor = new FfmpegProcessor(config, store);
    if (sourceKind === 'hls') {
        const probe = await processor.probe(sourcePath);
        const header = await store.readHeader(sourcePath, 16 * 1024 * 1024);
        if (chooseProcessingMode(probe, hasFaststartFromBuffer(header)) !== 'direct') {
            throw new Error('HLS copy-remux is not directly publishable; transcoding is forbidden for this migration.');
        }
    }
    const job: ProcessingJob = { upload_id: dedicatedId, user_id: video.user_id, video_id: video.id, source_path: sourcePath, mime_type: video.mime_type || 'video/mp4', size: (await stat(sourcePath)).size };
    const result = await processor.process(job);
    if (sourceKind === 'hls' && result.mode !== 'direct') throw new Error('HLS migration attempted a non-copy processing mode.');
    const videoPath = await store.publishVideo(dedicatedId, video.id, result.outputPath);
    const thumbnailPath = await store.publishThumbnail(dedicatedId, video.id, result.thumbnailPath);
    return { mode: result.mode, probe: result.probe, videoSha256: await sha256(videoPath), thumbnailSha256: await sha256(thumbnailPath) };
}

async function verifyRange(url: string, expectedBaseUrl: string): Promise<void> {
    if (!url || !/^https:\/\//.test(url)) throw new Error('A public HTTPS playback URL is required for verification.');
    const expectedOrigin = new URL(expectedBaseUrl).origin;
    const response = await fetch(url, { headers: { Range: 'bytes=0-1' }, signal: AbortSignal.timeout(15_000) });
    const range = response.headers.get('content-range');
    if (new URL(response.url).protocol !== 'https:' || new URL(response.url).origin !== expectedOrigin
        || response.status !== 206 || !range || !/^bytes 0-1\/\d+$/.test(range)
        || !isVideoResponse(response.headers.get('content-type'))) {
        await response.body?.cancel();
        throw new Error(`Playback URL failed exact HTTPS Range verification (HTTP ${response.status}).`);
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length !== 2) {
        throw new Error(`Playback URL failed exact HTTPS Range verification (HTTP ${response.status}).`);
    }
}

async function verifyThumbnail(url: string, expectedBaseUrl: string): Promise<void> {
    if (!url || !/^https:\/\//.test(url)) throw new Error('A public HTTPS thumbnail URL is required for verification.');
    const expectedOrigin = new URL(expectedBaseUrl).origin;
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const body = Buffer.from(await response.arrayBuffer());
    if (!response.ok || new URL(response.url).protocol !== 'https:' || new URL(response.url).origin !== expectedOrigin
        || !response.headers.get('content-type')?.toLowerCase().startsWith('image/jpeg')
        || body.length < 4 || body[0] !== 0xff || body[1] !== 0xd8) {
        throw new Error(`Thumbnail failed HTTPS/JPEG verification (HTTP ${response.status}).`);
    }
}

function expandThumbnailUrl(env: NodeJS.ProcessEnv, videoId: number, dedicatedId: string): string {
    const template = env.BUNNY_MIGRATION_THUMBNAIL_URL_TEMPLATE?.trim() || `${env.VIDEO_SERVICE_PUBLIC_URL?.trim() || ''}/thumbnails/{videoId}/{dedicatedId}.jpg`;
    return template.replaceAll('{videoId}', String(videoId)).replaceAll('{dedicatedId}', encodeURIComponent(dedicatedId));
}

async function saveRollbackMapping(path: string, state: MigrationState): Promise<void> {
    await mkdir(dirname(path), { recursive: true, mode: 0o750 });
    const mapping = Object.values(state.entries).map((entry) => ({
        video_id: entry.videoId,
        bunny_video_guid: entry.bunnyGuid,
        owner_user_id: entry.ownerUserId ?? null,
        category_id: entry.categoryId ?? null,
        title: entry.title ?? null,
        description: entry.description ?? null,
        total_views: entry.totalViews ?? null,
        unique_viewers: entry.uniqueViewers ?? null,
        dedicated_video_id: entry.dedicatedId,
        status: entry.status,
        playback_url: entry.playbackUrl || null,
        updated_at: entry.updatedAt,
    }));
    const temporary = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(mapping, null, 2), { mode: 0o640 });
    await rename(temporary, path);
}

export function expandTemplate(template: string, libraryId: number, guid: string): string {
    return template.replaceAll('{libraryId}', String(libraryId)).replaceAll('{guid}', encodeURIComponent(guid));
}

function expandPublicUrl(env: NodeJS.ProcessEnv, videoId: number, dedicatedId: string): string {
    const template = env.BUNNY_MIGRATION_PUBLIC_URL_TEMPLATE?.trim() || `${env.VIDEO_SERVICE_PUBLIC_URL?.trim() || ''}/videos/{videoId}/{dedicatedId}.mp4`;
    return template.replaceAll('{videoId}', String(videoId)).replaceAll('{dedicatedId}', encodeURIComponent(dedicatedId));
}

function isVideoResponse(contentType: string | null): boolean {
    return Boolean(contentType && (contentType.toLowerCase().startsWith('video/') || contentType.toLowerCase().includes('application/octet-stream')));
}

function isHlsResponse(contentType: string | null): boolean {
    const type = contentType?.toLowerCase() || '';
    return type.includes('mpegurl') || type.includes('x-mpegurl');
}

export function safeJoin(root: string, ...parts: string[]): string {
    const base = resolve(root); const result = resolve(base, ...parts);
    if (!result.startsWith(`${base}/`)) throw new Error('Unsafe migration path.');
    return result;
}

async function fileSizeOrZero(path: string): Promise<number> { try { return (await stat(path)).size; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0; throw error; } }
async function sha256(path: string): Promise<string> { const hash = createHash('sha256'); await pipeline(createReadStream(path), hash); return hash.digest('hex'); }
export function redactUrl(url: string): string {
    try {
        const parsed = new URL(url);
        parsed.search = '';
        parsed.hash = '';
        parsed.pathname = parsed.pathname.split('/').map((segment) => segment.startsWith('bcdn_token=') ? '[redacted-token]' : segment).join('/');
        return parsed.toString();
    } catch { return '[redacted-url]'; }
}
export function sanitizeErrorMessage(message: string): string {
    return message.replace(/https?:\/\/[^\s"']+/gi, (value) => redactUrl(value)).replace(/bcdn_token=[^\s/&]+/gi, 'bcdn_token=[redacted]');
}
function delay(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function downloadHls(ffmpegBin: string, masterUrl: string, destination: string, retries: number, timeoutMs: number, expectedHost: string, expectedGuid: string): Promise<{ bytes: number; sha256: string }> {
    validateHlsUrl(masterUrl, expectedHost, expectedGuid);
    const partial = `${destination}.part`;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const bundleRoot = `${destination}.hls.${randomUUID()}`;
        try {
            await mkdir(dirname(destination), { recursive: true, mode: 0o750 });
            const media = await highestHlsVariant(masterUrl, timeoutMs, expectedHost, expectedGuid);
            const localPlaylist = await materializeHlsPlaylist(media.playlist, media.baseUrl, media.resources, bundleRoot, timeoutMs, expectedHost, expectedGuid);
            await runFfmpeg(ffmpegBin, hlsCopyRemuxArgs(partial), timeoutMs, localPlaylist);
            const bytes = (await stat(partial)).size;
            if (bytes < 1) throw new Error('HLS remux produced an empty file.');
            await rename(partial, destination);
            return { bytes, sha256: await sha256(destination) };
        } catch (error) {
            await rm(partial, { force: true });
            if (attempt >= retries) throw error;
            await delay(1000 * 2 ** attempt);
        } finally {
            await rm(bundleRoot, { recursive: true, force: true });
        }
    }
    throw new Error('Unreachable HLS retry state.');
}

export function hlsCopyRemuxArgs(destination: string): string[] {
    return ['-y', '-protocol_whitelist', 'pipe,file,crypto', '-f', 'hls', '-i', 'pipe:0', '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-movflags', '+faststart', '-f', 'mp4', destination];
}

async function highestHlsVariant(masterUrl: string, timeoutMs: number, expectedHost: string, expectedGuid: string): Promise<{ playlist: string; baseUrl: string; resources: string[] }> {
    const response = await fetch(masterUrl, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
    if (!response.ok) throw new Error(`Bunny HLS playlist HTTP ${response.status}.`);
    validateHlsUrl(response.url, expectedHost, expectedGuid);
    const lines = (await response.text()).split(/\r?\n/);
    let best: { bandwidth: number; uri: string } | null = null;
    for (let index = 0; index < lines.length; index += 1) {
        const info = lines[index]?.match(/^#EXT-X-STREAM-INF:.*BANDWIDTH=(\d+)/);
        const uri = lines[index + 1]?.trim();
        if (!info || !uri || uri.startsWith('#')) continue;
        const candidate = { bandwidth: Number(info[1]), uri };
        if (!best || candidate.bandwidth > best.bandwidth) best = candidate;
    }
    if (!best) throw new Error('Bunny HLS master playlist has no media variants.');
    const resolved = new URL(best.uri, response.url).toString();
    validateHlsUrl(resolved, expectedHost, expectedGuid);
    return validateHlsMediaPlaylist(resolved, timeoutMs, expectedHost, expectedGuid);
}

async function validateHlsMediaPlaylist(mediaUrl: string, timeoutMs: number, expectedHost: string, expectedGuid: string): Promise<{ playlist: string; baseUrl: string; resources: string[] }> {
    const response = await fetch(mediaUrl, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
    if (!response.ok) throw new Error(`Bunny HLS media playlist HTTP ${response.status}.`);
    validateHlsUrl(response.url, expectedHost, expectedGuid);
    const playlist = await response.text();
    const resources = validateHlsPlaylistResources(playlist, response.url, expectedHost, expectedGuid);
    if (resources.length === 0) throw new Error('Bunny HLS media playlist has no validated segments.');
    return { playlist, baseUrl: response.url, resources };
}

async function materializeHlsPlaylist(playlist: string, baseUrl: string, resources: string[], bundleRoot: string, timeoutMs: number, expectedHost: string, expectedGuid: string): Promise<string> {
    await mkdir(bundleRoot, { recursive: true, mode: 0o750 });
    const localByUrl = new Map<string, string>();
    for (const [index, resourceUrl] of [...new Set(resources)].entries()) {
        validateHlsUrl(resourceUrl, expectedHost, expectedGuid);
        const extension = new URL(resourceUrl).pathname.toLowerCase().match(/\.[a-z0-9]{1,8}$/)?.[0] || '.bin';
        const localPath = safeJoin(bundleRoot, `${String(index).padStart(6, '0')}${extension}`);
        const response = await fetch(resourceUrl, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
        if (!response.ok || !response.body) throw new Error(`Bunny HLS resource HTTP ${response.status}.`);
        validateHlsUrl(response.url, expectedHost, expectedGuid);
        const handle = await open(localPath, 'wx', 0o640);
        try { await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), handle.createWriteStream()); }
        finally { await handle.close(); }
        if (await fileSizeOrZero(localPath) < 1) throw new Error('Bunny HLS resource is empty.');
        localByUrl.set(resourceUrl, localPath);
    }
    return rewriteHlsPlaylistWithLocalFiles(playlist, baseUrl, expectedHost, expectedGuid, localByUrl);
}

export function validateHlsPlaylistResources(playlist: string, baseUrl: string, expectedHost: string, expectedGuid: string): string[] {
    const lines = playlist.split(/\r?\n/);
    const validated: string[] = [];
    for (const lineValue of lines) {
        const line = lineValue.trim();
        if (!line) continue;
        const uris = line.startsWith('#')
            ? [...line.matchAll(/URI="([^"]+)"/g)].map((match) => match[1])
            : [line];
        for (const uri of uris) {
            const resolved = new URL(uri, baseUrl).toString();
            validateHlsUrl(resolved, expectedHost, expectedGuid);
            validated.push(resolved);
        }
    }
    return validated;
}

export function rewriteValidatedHlsPlaylist(playlist: string, baseUrl: string, expectedHost: string, expectedGuid: string): string {
    return playlist.split(/\r?\n/).map((lineValue) => {
        const line = lineValue.trim();
        if (!line) return lineValue;
        if (!line.startsWith('#')) {
            const resolved = new URL(line, baseUrl).toString();
            validateHlsUrl(resolved, expectedHost, expectedGuid);
            return resolved;
        }
        return lineValue.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
            const resolved = new URL(uri, baseUrl).toString();
            validateHlsUrl(resolved, expectedHost, expectedGuid);
            return `URI="${resolved}"`;
        });
    }).join('\n');
}

export function rewriteHlsPlaylistWithLocalFiles(playlist: string, baseUrl: string, expectedHost: string, expectedGuid: string, localByUrl: ReadonlyMap<string, string>): string {
    const localFor = (uri: string): string => {
        const resolved = new URL(uri, baseUrl).toString();
        validateHlsUrl(resolved, expectedHost, expectedGuid);
        const local = localByUrl.get(resolved);
        if (!local) throw new Error('Validated HLS resource is missing from the local bundle.');
        return pathToFileURL(local).toString();
    };
    return playlist.split(/\r?\n/).map((lineValue) => {
        const line = lineValue.trim();
        if (!line) return lineValue;
        if (!line.startsWith('#')) return localFor(line);
        return lineValue.replace(/URI="([^"]+)"/g, (_match, uri: string) => `URI="${localFor(uri)}"`);
    }).join('\n');
}

export function validateHlsUrl(value: string, expectedHost: string, expectedGuid: string): void {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !expectedHost || url.hostname !== expectedHost || !url.pathname.includes(`/${expectedGuid}/`)) {
        throw new Error('Bunny HLS URL escaped the expected HTTPS host/GUID boundary.');
    }
}

function runFfmpeg(binary: string, args: string[], timeoutMs: number, stdin: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(binary, args, { stdio: ['pipe', 'ignore', 'pipe'] });
        let stderr = '';
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
        child.stderr.on('data', (chunk: Buffer) => { stderr = `${stderr}${chunk.toString()}`.slice(-2000); });
        child.stdin.end(stdin);
        child.once('error', (error) => { clearTimeout(timer); reject(error); });
        child.once('close', (code) => { clearTimeout(timer); if (timedOut) reject(new Error('FFmpeg HLS remux timed out.')); else if (code === 0) resolve(); else reject(new Error(`FFmpeg exited with ${code}: ${sanitizeErrorMessage(stderr)}`)); });
    });
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true, mode: 0o750 });
    const temporary = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o640 });
    await rename(temporary, path);
}

export async function writeJsonImmutable(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true, mode: 0o750 });
    await writeFile(path, JSON.stringify(value, null, 2), { mode: 0o640, flag: 'wx' });
}
