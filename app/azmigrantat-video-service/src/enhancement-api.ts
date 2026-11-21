import type { IncomingMessage, ServerResponse } from 'node:http';
import type { VideoServiceConfig } from './config';
import { verifyEnhancementToken } from './admin-token';
import { EnhancementUnavailableError, VideoEnhancementService } from './enhancement-service';

function send(response: ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    response.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'Cache-Control': 'no-store' });
    response.end(payload);
}
function bearer(request: IncomingMessage): string | null { const value = request.headers.authorization; return value?.startsWith('Bearer ') ? value.slice(7).trim() : null; }
async function jsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of request) { const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += part.length; if (size > 16 * 1024) throw new EnhancementUnavailableError('Заявката е твърде голяма.', 413); chunks.push(part); }
    if (size === 0) return {};
    const decoded = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new EnhancementUnavailableError('Невалиден JSON.', 400);
    return decoded as Record<string, unknown>;
}

export async function handleEnhancementRequest(request: IncomingMessage, response: ServerResponse, config: VideoServiceConfig, service: VideoEnhancementService): Promise<boolean> {
    const url = new URL(request.url || '/', 'http://localhost');
    if (!url.pathname.startsWith('/v1/enhancements')) return false;
    try {
        const token = bearer(request);
        if (!token) throw new EnhancementUnavailableError('Изисква се служебна авторизация.', 401, 'unauthorized');
        let claims;
        try { claims = verifyEnhancementToken(token, config.adminTokenSecret); }
        catch { throw new EnhancementUnavailableError('Невалидна или изтекла авторизация.', 401, 'unauthorized'); }
        if (request.method === 'GET' && url.pathname === '/v1/enhancements/options') {
            return send(response, 200, { success: true, data: await service.options(claims) }), true;
        }
        if (request.method === 'POST' && url.pathname === '/v1/enhancements') {
            const job = await service.create(claims, await jsonBody(request));
            return send(response, job.status === 'pending' ? 202 : 200, { success: true, data: service.response(job) }), true;
        }
        const match = url.pathname.match(/^\/v1\/enhancements\/([a-f0-9-]{36})$/i);
        if (match && request.method === 'GET') return send(response, 200, { success: true, data: service.response(await service.getOwned(claims, match[1])) }), true;
        if (match && request.method === 'DELETE') return send(response, 200, { success: true, data: service.response(await service.cancel(claims, match[1])) }), true;
        return send(response, 404, { success: false, message: 'Not found.' }), true;
    } catch (error) {
        const known = error instanceof EnhancementUnavailableError;
        const message = error instanceof Error ? error.message : 'Заявката за подобряване е неуспешна.';
        send(response, known ? error.statusCode : 400, { success: false, message, code: known ? error.code : 'invalid_request' });
        return true;
    }
}
