import { randomUUID } from 'node:crypto';
import { chmod, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { issueUploadToken } from './token';
import { issueDeleteToken } from './admin-token';

type EnvMap = Record<string, string>;
type UploadState = { status: string; uploadOffset: number; uploadLength: number; sourcePath?: string; playbackPath?: string; thumbnailPath?: string; duration?: number; width?: number; height?: number; fileSize?: number; failureReason?: string };

function parseArgs(argv: string[]): { envFile: string; baseUrl: string; timeoutMs: number; keepArtifacts: boolean; deleteAfterReady: boolean } {
    const args = new Map<string, string>(); let keepArtifacts = false; let deleteAfterReady = false;
    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];
        if (value === '--keep-artifacts') { keepArtifacts = true; continue; }
        if (value === '--delete-after-ready') { deleteAfterReady = true; continue; }
        if (value === '--help') { console.log('Usage: node dist/synthetic-e2e.js [--env-file PATH] [--base-url URL] [--timeout-seconds N] [--keep-artifacts] [--delete-after-ready]'); process.exit(0); }
        if (!value.startsWith('--') || !argv[index + 1]) throw new Error(`Unknown argument: ${value}`);
        args.set(value.slice(2), argv[++index]);
    }
    const timeoutSeconds = Number(args.get('timeout-seconds') || 120);
    if (!Number.isSafeInteger(timeoutSeconds) || timeoutSeconds < 10 || timeoutSeconds > 900) throw new Error('timeout-seconds must be between 10 and 900.');
    return { envFile: args.get('env-file') || '/etc/azmigrantat-video/video-service.env', baseUrl: (args.get('base-url') || 'http://127.0.0.1:3100').replace(/\/+$/, ''), timeoutMs: timeoutSeconds * 1000, keepArtifacts, deleteAfterReady };
}

export async function readProtectedEnv(path: string): Promise<EnvMap> {
    const metadata = await stat(path);
    if ((metadata.mode & 0o007) !== 0) throw new Error('Environment file is group/world unsafe; expected no permissions for others.');
    const result: EnvMap = {};
    for (const rawLine of (await readFile(path, 'utf8')).split(/\r?\n/)) {
        const line = rawLine.trim(); if (!line || line.startsWith('#')) continue;
        const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (!match) continue;
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        result[match[1]] = value;
    }
    if (!result.VIDEO_SERVICE_TOKEN_SECRET || result.VIDEO_SERVICE_TOKEN_SECRET === 'replace-with-a-long-random-secret') throw new Error('VIDEO_SERVICE_TOKEN_SECRET is not configured.');
    return result;
}

function run(binary: string, args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const child = spawn(binary, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] }); let stdout = ''; let stderr = ''; let timedOut = false;
        child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8'); child.stdout.on('data', (chunk) => { stdout += chunk; }); child.stderr.on('data', (chunk) => { stderr += chunk; });
        const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
        child.once('error', (error) => { clearTimeout(timer); reject(error); });
        child.once('close', (code) => { clearTimeout(timer); if (timedOut) return reject(new Error(`${binary} timed out.`)); if (code !== 0) return reject(new Error(`${binary} failed: ${stderr.slice(-1000)}`)); resolve({ stdout, stderr }); });
    });
}

function metadata(filename: string): string { return `filename ${Buffer.from(filename).toString('base64')},filetype ${Buffer.from('video/mp4').toString('base64')}`; }
async function jsonResponse(response: Response): Promise<Record<string, unknown>> { const body = await response.text(); try { return JSON.parse(body) as Record<string, unknown>; } catch { throw new Error(`Unexpected HTTP response (${response.status}).`); } }
export function isAcceptedCompletionStatus(status: unknown): boolean { return ['queued', 'processing', 'ready'].includes(String(status)); }
export async function requestUploadHead(baseUrl: string, uploadId: string, token: string): Promise<Response> {
    return fetch(`${baseUrl.replace(/\/+$/, '')}/v1/uploads/${uploadId}`, { method: 'HEAD', headers: { Authorization: `Bearer ${token}`, 'Tus-Resumable': '1.0.0' } });
}
export async function deleteSyntheticUpload(
    location: string,
    token: string,
    timeoutMs: number,
): Promise<Response> {
    const deadline = Date.now() + timeoutMs;
    let response = await fetch(location, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    while (response.status === 409 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        response = await fetch(location, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    }
    return response;
}
async function redisLength(redisUrl: string, key: string): Promise<number> { const result = await run('redis-cli', ['-u', redisUrl, '--raw', 'LLEN', key], 5000); const value = Number(result.stdout.trim()); return Number.isSafeInteger(value) ? value : -1; }
async function waitForState(path: string, timeoutMs: number): Promise<{ state: UploadState; statuses: string[]; elapsedMs: number }> {
    const started = Date.now(); const statuses: string[] = []; let last = '';
    while (Date.now() - started < timeoutMs) {
        try { const state = JSON.parse(await readFile(path, 'utf8')) as UploadState; if (state.status !== last) { statuses.push(state.status); last = state.status; } if (state.status === 'ready' || state.status === 'failed') return { state, statuses, elapsedMs: Date.now() - started }; } catch { /* state may not exist immediately */ }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Timed out waiting for processing state: ${statuses.join(',') || 'none'}.`);
}

async function rangeCheck(publicUrl: string, videoPath: string): Promise<string> {
    if (!publicUrl) return 'skipped (VIDEO_SERVICE_PUBLIC_URL is not configured)';
    const url = `${publicUrl}/videos/${videoPath}`;
    const response = await fetch(url, { headers: { Range: 'bytes=0-15' } });
    if (response.status !== 206) throw new Error(`Range playback expected 206, got ${response.status}.`);
    const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.length !== 16) throw new Error(`Range playback returned ${bytes.length} bytes.`);
    return `passed (${response.status}, ${bytes.length} bytes)`;
}

async function main(): Promise<void> {
    const options = parseArgs(process.argv.slice(2)); const env = await readProtectedEnv(options.envFile); const uploadId = randomUUID();
    const syntheticUserId = 2147483001; const syntheticVideoId = 2147483001; const root = env.VIDEO_SERVICE_ROOT || '/srv/azmigrantat-video'; const queueKey = env.VIDEO_SERVICE_QUEUE_KEY || 'azmigrantat:video:processing';
    const workDir = await mkdtemp(join(tmpdir(), 'azmigrantat-video-e2e-')); await chmod(workDir, 0o700); const inputPath = join(workDir, `${uploadId}.mp4`); const token = issueUploadToken({ upload_id: uploadId, user_id: syntheticUserId, video_id: syntheticVideoId, exp: Math.floor(Date.now() / 1000) + 300, max_size: 64 * 1024 * 1024, mime_type: 'video/mp4' }, env.VIDEO_SERVICE_TOKEN_SECRET);
    if (options.deleteAfterReady && (!env.VIDEO_SERVICE_ADMIN_SECRET || env.VIDEO_SERVICE_ADMIN_SECRET.startsWith('replace-'))) throw new Error('VIDEO_SERVICE_ADMIN_SECRET is not configured for delete-after-ready.');
    try {
        await run(env.FFMPEG_BIN || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=24', '-f', 'lavfi', '-i', 'sine=frequency=1000:sample_rate=48000', '-t', '5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', '-y', inputPath], options.timeoutMs);
        const input = await readFile(inputPath); const headers = { Authorization: `Bearer ${token}`, 'Tus-Resumable': '1.0.0', 'Upload-Length': String(input.length), 'Content-Type': 'video/mp4', 'Upload-Metadata': metadata('synthetic-e2e.mp4') };
        const created = await fetch(`${options.baseUrl}/v1/uploads`, { method: 'POST', headers }); if (created.status !== 201) throw new Error(`TUS POST failed with ${created.status}.`); const createdBody = await jsonResponse(created); if (createdBody.upload_id !== uploadId) throw new Error('TUS POST returned an unexpected upload id.');
        const location = `${options.baseUrl}/v1/uploads/${uploadId}`; const head = await requestUploadHead(options.baseUrl, uploadId, token); if (head.status !== 200 || head.headers.get('upload-offset') !== '0') throw new Error(`TUS HEAD did not report offset 0 (status=${head.status}, upload-offset=${head.headers.get('upload-offset') || '<missing>'}).`);
        const patch = await fetch(location, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Tus-Resumable': '1.0.0', 'Upload-Offset': '0', 'Content-Type': 'application/offset+octet-stream' }, body: input, duplex: 'half' } as RequestInit & { duplex: 'half' });
        const patchBody = patch.status === 200 ? await jsonResponse(patch) : null;
        const patchCompleted = patch.status === 204 && patch.headers.get('upload-offset') === String(input.length);
        const patchAutoCompleted = patch.status === 200 && patchBody?.status === 'queued' && patch.headers.get('upload-offset') === String(input.length);
        if (!patchCompleted && !patchAutoCompleted) throw new Error('TUS PATCH did not advance to the complete offset.');
        const beforeComplete = await redisLength(env.REDIS_URL || 'redis://127.0.0.1:6379', queueKey);
        const completedAt = Date.now(); const complete = await fetch(`${location}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Tus-Resumable': '1.0.0' } }); if (complete.status !== 200) throw new Error(`TUS complete failed with ${complete.status}.`); const completeBody = await jsonResponse(complete); if (!isAcceptedCompletionStatus(completeBody.status)) throw new Error('TUS complete returned an invalid processing status.');
        const statePath = join(root, 'state', `${uploadId}.json`); const result = await waitForState(statePath, options.timeoutMs); if (result.state.status !== 'ready') throw new Error(`Worker ended in ${result.state.status}: ${result.state.failureReason || 'no failure reason recorded'}.`); if (!result.state.playbackPath || !result.state.thumbnailPath) throw new Error('Ready state is missing playback or thumbnail path.');
        const [videoStat, thumbnailStat] = await Promise.all([stat(result.state.playbackPath), stat(result.state.thumbnailPath)]); if (!videoStat.isFile() || videoStat.size === 0 || !thumbnailStat.isFile() || thumbnailStat.size === 0) throw new Error('Final video or thumbnail is missing.');
        const probe = await run(env.FFPROBE_BIN || 'ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', result.state.playbackPath], options.timeoutMs); const range = await rangeCheck(env.VIDEO_SERVICE_PUBLIC_URL || '', `${syntheticVideoId}/${uploadId}.mp4`); const afterComplete = await redisLength(env.REDIS_URL || 'redis://127.0.0.1:6379', queueKey);
        let deletion: Record<string, unknown> = { status: 'skipped' };
        if (options.deleteAfterReady) {
            const deleteToken = issueDeleteToken({ action: 'delete', provider: 'oneprovider', upload_id: uploadId, user_id: syntheticUserId, video_id: syntheticVideoId, exp: Math.floor(Date.now() / 1000) + 300 }, env.VIDEO_SERVICE_ADMIN_SECRET);
            const deleted = await deleteSyntheticUpload(location, deleteToken, options.timeoutMs);
            if (deleted.status !== 204) throw new Error(`Synthetic DELETE failed with ${deleted.status}.`);
            for (const path of [result.state.playbackPath, result.state.thumbnailPath, result.state.sourcePath, statePath]) { if (path) { try { await stat(path); throw new Error(`Synthetic DELETE left an artifact: ${path}`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } } }
            deletion = { status: deleted.status, artifacts_removed: true };
        }
        console.log(JSON.stringify({ success: true, upload_id: uploadId, tus: { post: created.status, head: head.status, patch: patch.status, complete: complete.status }, redis_queue_length_before_complete: beforeComplete, redis_queue_length_after_ready: afterComplete, statuses: result.statuses, processing_ms: result.elapsedMs, video_bytes: videoStat.size, thumbnail_bytes: thumbnailStat.size, state_metadata: { duration: result.state.duration, width: result.state.width, height: result.state.height, file_size: result.state.fileSize }, ffprobe: JSON.parse(probe.stdout), range, deletion }, null, 2));
        if (!options.keepArtifacts) await cleanup(root, uploadId, syntheticVideoId, workDir);
    } catch (error) { await rm(workDir, { recursive: true, force: true }); throw error; }
}

async function cleanup(root: string, uploadId: string, videoId: number, workDir: string): Promise<void> {
    await rm(workDir, { recursive: true, force: true });
    const exactPaths = [join(root, 'state', `${uploadId}.json`), join(root, 'private', 'originals', String(videoId), `${uploadId}.mp4`), join(root, 'public', 'videos', String(videoId), `${uploadId}.mp4`), join(root, 'public', 'thumbnails', String(videoId), `${uploadId}.jpg`), join(root, 'private', 'processing', uploadId), join(root, 'state', 'callbacks', `${uploadId}:uploaded.json`), join(root, 'state', 'callbacks', `${uploadId}:queued.json`), join(root, 'state', 'callbacks', `${uploadId}:processing.json`), join(root, 'state', 'callbacks', `${uploadId}:ready.json`), join(root, 'state', 'callbacks', `${uploadId}:failed.json`), join(root, 'private', 'uploads', `${uploadId}.part`)];
    for (const path of exactPaths) await rm(path, { recursive: true, force: true });
    for (const directory of [join(root, 'private', 'originals', String(videoId)), join(root, 'public', 'videos', String(videoId)), join(root, 'public', 'thumbnails', String(videoId))]) { try { if ((await readdir(directory)).length === 0) await rm(directory); } catch { /* cleanup is best effort */ } }
}

if (require.main === module) void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Synthetic E2E failed.'); process.exitCode = 1; });
