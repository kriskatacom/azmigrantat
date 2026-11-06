import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { VideoServiceConfig } from './config';
import { InMemoryProcessingQueue, type ProcessingQueue } from './queue';
import { UploadStore } from './store';
import { TUS_VERSION, type UploadMetadata, type UploadState } from './types';
import { decodeUploadToken, verifyUploadToken } from './token';
import { verifyDeleteToken } from './admin-token';
import { StatusCallbackOutbox } from './callbacks';

type Dependencies = { config: VideoServiceConfig; store: UploadStore; queue?: ProcessingQueue };
function send(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void { const payload = JSON.stringify(body); response.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers }); response.end(payload); }
function tus(response: ServerResponse, headers: Record<string, string> = {}): void { response.setHeader('Tus-Resumable', TUS_VERSION); response.setHeader('Tus-Version', TUS_VERSION); response.setHeader('Tus-Extension', 'creation'); for (const [key, value] of Object.entries(headers)) response.setHeader(key, value); }
function auth(request: IncomingMessage): string | null { const value = request.headers.authorization; return value?.startsWith('Bearer ') ? value.slice(7).trim() : null; }
function parseMetadata(value: string | undefined): UploadMetadata { const result: UploadMetadata = {}; for (const item of (value || '').split(',')) { const [key, encoded] = item.trim().split(/\s+/, 2); if (!key || !encoded) continue; if (!/^[a-z]+$/i.test(key)) throw new Error('Invalid Upload-Metadata key.'); const decoded = Buffer.from(encoded, 'base64').toString('utf8'); if (key === 'filename') result.filename = decoded; if (key === 'filetype') result.filetype = decoded.toLowerCase(); } return result; }
async function body(request: IncomingMessage, maxBytes: number): Promise<Buffer> { const chunks: Buffer[] = []; let size = 0; for await (const chunk of request) { const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += part.length; if (size > maxBytes) throw new Error('Upload chunk exceeds the configured limit.'); chunks.push(part); } return Buffer.concat(chunks); }

export function createVideoUploadServer({ config, store, queue = new InMemoryProcessingQueue() }: Dependencies): Server {
    return createServer(async (request, response) => {
        try {
            const url = new URL(request.url || '/', 'http://localhost');
            if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, { success: true, service: 'azmigrantat-video-service' });
            const match = url.pathname.match(/^\/v1\/uploads(?:\/([^/]+))?(\/complete)?$/);
            tus(response);
            if (!match) return send(response, 404, { success: false, message: 'Not found.' });

            if (request.method === 'POST' && !match[1]) {
                const token = auth(request); const length = Number(request.headers['upload-length']); const mimeType = String(request.headers['content-type'] || '').toLowerCase();
                if (!token || !Number.isSafeInteger(length) || length <= 0 || length > config.maxUploadBytes) return send(response, 400, { success: false, message: 'Valid Authorization, Upload-Length and size are required.' });
                if (request.headers['tus-resumable'] !== TUS_VERSION) return send(response, 412, { success: false, message: 'Tus-Resumable: 1.0.0 is required.' });
                if (!config.allowedMimeTypes.has(mimeType)) return send(response, 415, { success: false, message: 'Unsupported video MIME type.' });
                const claims = decodeUploadToken(token, config.tokenSecret); if (claims.max_size < length || claims.mime_type !== mimeType) return send(response, 422, { success: false, message: 'Token does not authorize this upload.' });
                const state = store.createState({ uploadId: claims.upload_id, userId: claims.user_id, videoId: claims.video_id, uploadLength: length, metadata: parseMetadata(String(request.headers['upload-metadata'] || '')), mimeType, expiresAt: claims.exp });
                if (await store.get(state.uploadId)) return send(response, 409, { success: false, message: 'Upload already exists.' });
                await store.save(state); response.setHeader('Location', `/v1/uploads/${state.uploadId}`); response.setHeader('Upload-Offset', '0'); return send(response, 201, { success: true, upload_id: state.uploadId, status: state.status });
            }
            const uploadId = match[1]; if (!uploadId) return send(response, 405, { success: false, message: 'Method not allowed.' });
            if (request.method === 'DELETE') return deleteUpload(request, response, uploadId, store, config);
            const state = await store.get(uploadId); if (!state) return send(response, 404, { success: false, message: 'Upload not found.' });
            const token = auth(request); if (!token) return send(response, 401, { success: false, message: 'Bearer upload token required.' });
            const claims = verifyUploadToken(token, config.tokenSecret, { uploadId, userId: state.userId });
            if (claims.video_id !== state.videoId || claims.mime_type !== state.mimeType) return send(response, 403, { success: false, message: 'Upload token does not match this upload.' });
            if (request.method === 'HEAD') { response.setHeader('Upload-Offset', String(state.uploadOffset)); response.setHeader('Upload-Length', String(state.uploadLength)); response.setHeader('Cache-Control', 'no-store'); response.writeHead(200); return response.end(); }
            if (request.method === 'PATCH' && !match[2]) {
                if (request.headers['tus-resumable'] !== TUS_VERSION || request.headers['content-type'] !== 'application/offset+octet-stream') return send(response, 412, { success: false, message: 'Invalid TUS headers.' });
                const offset = Number(request.headers['upload-offset']); if (!Number.isSafeInteger(offset) || offset !== state.uploadOffset) return send(response, 409, { success: false, message: 'Upload offset conflict.' }, { 'Upload-Offset': String(state.uploadOffset) });
                const lock = await store.acquireProcessLock(uploadId); if (!lock) return send(response, 409, { success: false, message: 'Upload is busy.' });
                try { return await store.withLock(uploadId, async () => { const fresh = await store.get(uploadId); if (!fresh) return send(response, 404, { success: false, message: 'Upload not found.' }); const chunk = await body(request, config.maxChunkBytes); if (fresh.uploadOffset + chunk.length > fresh.uploadLength) return send(response, 413, { success: false, message: 'Upload exceeds Upload-Length.' }); await store.append(uploadId, chunk); fresh.uploadOffset += chunk.length; fresh.status = fresh.uploadOffset > 0 ? 'uploading' : 'created'; fresh.updatedAt = new Date().toISOString(); await store.save(fresh); if (fresh.uploadOffset === fresh.uploadLength) return complete(response, fresh, store, queue, config); tus(response, { 'Upload-Offset': String(fresh.uploadOffset) }); response.writeHead(204); return response.end(); }); } finally { await lock(); }
            }
            if (request.method === 'POST' && match[2]) {
                if (['queued', 'processing', 'ready', 'failed', 'deleting'].includes(state.status)) return send(response, 200, { success: true, upload_id: state.uploadId, status: state.status }, { 'Upload-Offset': String(state.uploadOffset) });
                const lock = await store.acquireProcessLock(uploadId); if (!lock) return send(response, 409, { success: false, message: 'Upload is busy.' });
                try { return await store.withLock(uploadId, async () => complete(response, state, store, queue, config)); } finally { await lock(); }
            }
            return send(response, 405, { success: false, message: 'Method not allowed.' });
        } catch (error) { const message = error instanceof Error ? error.message : 'Upload request failed.'; return send(response, /token|Token|signature|expired/.test(message) ? 401 : 400, { success: false, message }); }
    });
}

async function deleteUpload(request: IncomingMessage, response: ServerResponse, uploadId: string, store: UploadStore, config: VideoServiceConfig): Promise<void> {
    const token = auth(request);
    if (!token) return send(response, 401, { success: false, message: 'Bearer delete token required.' });
    let claims;
    try { claims = verifyDeleteToken(token, config.adminTokenSecret, uploadId); } catch { return send(response, 401, { success: false, message: 'Invalid or expired delete token.' }); }
    const current = await store.get(uploadId);
    if (!current) {
        const tombstone = await store.getTombstone(uploadId);
        if (tombstone && tombstone.userId === claims.user_id && tombstone.videoId === claims.video_id && tombstone.provider === claims.provider) { response.writeHead(204); response.end(); return; }
        return send(response, 404, { success: false, message: 'Upload not found.' });
    }
    if ((current.provider || 'oneprovider') !== claims.provider || current.userId !== claims.user_id || current.videoId !== claims.video_id) return send(response, 403, { success: false, message: 'Delete token does not match this upload.' });
    const lock = await store.acquireProcessLock(uploadId);
    if (!lock) return send(response, 409, { success: false, message: 'Upload is busy.' });
    try {
        const fresh = await store.get(uploadId);
        if (!fresh) { response.writeHead(204); response.end(); return; }
        if ((fresh.provider || 'oneprovider') !== claims.provider || fresh.userId !== claims.user_id || fresh.videoId !== claims.video_id) return send(response, 403, { success: false, message: 'Delete token does not match this upload.' });
        fresh.status = 'deleting'; fresh.updatedAt = new Date().toISOString(); await store.save(fresh);
        await store.deleteUploadArtifacts(fresh);
        response.writeHead(204); response.end();
    } finally { await lock(); }
}
async function complete(response: ServerResponse, state: UploadState, store: UploadStore, queue: ProcessingQueue, config: VideoServiceConfig): Promise<void> {
    const fresh = await store.get(state.uploadId);
    if (!fresh || fresh.uploadOffset !== fresh.uploadLength) return send(response, 409, { success: false, message: 'Upload is incomplete.' }, { 'Upload-Offset': String(fresh?.uploadOffset ?? 0) });
    const completedHeaders = { 'Upload-Offset': String(fresh.uploadOffset) };
    if (fresh.status === 'queued') return send(response, 200, { success: true, upload_id: fresh.uploadId, status: fresh.status }, completedHeaders);
    const sourcePath = fresh.sourcePath || await store.finalize(fresh.uploadId, fresh.videoId, fresh.filename);
    fresh.sourcePath = sourcePath;
    fresh.status = 'uploaded';
    fresh.updatedAt = new Date().toISOString();
    await store.save(fresh);
    await notifyStatus(config, fresh, sourcePath);
    await queue.enqueue({ upload_id: fresh.uploadId, user_id: fresh.userId, video_id: fresh.videoId, source_path: sourcePath, mime_type: fresh.mimeType, size: fresh.uploadLength });
    fresh.status = 'queued';
    fresh.updatedAt = new Date().toISOString();
    await store.save(fresh);
    await notifyStatus(config, fresh, sourcePath);
    return send(response, 200, { success: true, upload_id: fresh.uploadId, status: fresh.status }, completedHeaders);
}

async function notifyStatus(config: VideoServiceConfig, state: UploadState, sourcePath: string): Promise<void> {
    const payload = {
        event_id: `${state.uploadId}:${state.status}`,
        upload_id: state.uploadId,
        provider_video_id: state.uploadId,
        user_id: state.userId,
        video_id: state.videoId,
        status: state.status,
        storage_path: sourcePath,
        file_size: state.uploadLength,
        mime_type: state.mimeType,
    };
    await new StatusCallbackOutbox(config).publish(payload);
}
