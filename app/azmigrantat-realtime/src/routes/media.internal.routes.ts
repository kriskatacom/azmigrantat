import type { Express } from 'express';

import { config } from '../config';
import type { MediaNodeManager } from '../services/media/media-node-manager';

function isAuthorized(request: { header(name: string): string | undefined }): boolean {
    return request.header('X-Internal-Secret') === config.internalApiSecret;
}

export function registerMediaInternalRoutes(app: Express, manager: MediaNodeManager): void {
    app.get('/internal/media/nodes', async (request, response) => {
        if (!isAuthorized(request)) {
            response.status(401).json({ success: false, message: 'Невалиден вътрешен ключ.' });
            return;
        }

        response.json({ success: true, nodes: await manager.listNodes() });
    });

    app.post('/internal/media/allocate', async (request, response) => {
        if (!isAuthorized(request)) {
            response.status(401).json({ success: false, message: 'Невалиден вътрешен ключ.' });
            return;
        }

        const liveId = Number(request.body?.live_id);
        const mediaRoomId = request.body?.media_room_id;

        if (!Number.isInteger(liveId) || liveId <= 0 || typeof mediaRoomId !== 'string') {
            response.status(422).json({ success: false, message: 'Невалидни media allocation данни.' });
            return;
        }

        try {
            const assignment = await manager.allocate(liveId, mediaRoomId);
            response.json({ success: true, assignment });
        } catch (error) {
            console.error('[media-manager] allocation failed', error);
            response.status(503).json({
                success: false,
                message: error instanceof Error ? error.message : 'Media node allocation failed.',
            });
        }
    });

    app.get('/internal/media/assignment/:liveId', async (request, response) => {
        if (!isAuthorized(request)) {
            response.status(401).json({ success: false, message: 'Невалиден вътрешен ключ.' });
            return;
        }

        const liveId = Number(request.params.liveId);
        const assignment = Number.isInteger(liveId) && liveId > 0
            ? await manager.getAssignment(liveId)
            : null;

        if (!assignment) {
            response.status(404).json({ success: false, message: 'Media assignment not found.' });
            return;
        }

        response.json({ success: true, assignment });
    });

    app.post('/internal/media/session', async (request, response) => {
        if (!isAuthorized(request)) {
            response.status(401).json({ success: false, message: 'Невалиден вътрешен ключ.' });
            return;
        }

        const liveId = Number(request.body?.live_id);
        const role = request.body?.role;

        if (!Number.isInteger(liveId) || liveId <= 0 || (role !== 'streamer' && role !== 'viewer')) {
            response.status(422).json({ success: false, message: 'Невалидни media session данни.' });
            return;
        }

        try {
            const session = await manager.createSession(liveId, role);
            response.status(201).json({ success: true, session });
        } catch (error) {
            console.error('[media-manager] session creation failed', error);
            response.status(503).json({
                success: false,
                message: error instanceof Error ? error.message : 'Media session creation failed.',
            });
        }
    });

    app.post('/internal/media/release', async (request, response) => {
        if (!isAuthorized(request)) {
            response.status(401).json({ success: false, message: 'Невалиден вътрешен ключ.' });
            return;
        }

        const liveId = Number(request.body?.live_id);

        if (!Number.isInteger(liveId) || liveId <= 0) {
            response.status(422).json({ success: false, message: 'Невалидно live ID.' });
            return;
        }

        await manager.release(liveId);
        response.json({ success: true });
    });
}
