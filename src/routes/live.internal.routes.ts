import type { Express } from 'express';

import { config } from '../config';
import type { LiveService } from '../services/live/live-service';
import type { LiveCommentPayload, LiveStreamBroadcastPayload } from '../types/live';

function hasInternalSecret(request: { header: (name: string) => string | undefined }): boolean {
    const providedSecret = request.header('X-Internal-Secret');

    return Boolean(providedSecret && providedSecret === config.internalApiSecret);
}

export function registerLiveInternalRoutes(app: Express, lives: LiveService): void {
    app.post('/internal/events/live-comment', (request, response) => {
        if (!hasInternalSecret(request)) {
            response.status(401).json({
                success: false,
                message: 'Невалиден вътрешен ключ.',
            });
            return;
        }

        const comment = request.body?.comment as Partial<LiveCommentPayload> | undefined;

        if (
            !comment ||
            typeof comment.id !== 'number' ||
            typeof comment.live_id !== 'number' ||
            typeof comment.body !== 'string'
        ) {
            response.status(422).json({
                success: false,
                message: 'Невалидни данни за live коментар.',
            });
            return;
        }

        lives.broadcastComment(comment as LiveCommentPayload);

        response.json({ success: true });
    });

    app.post('/internal/events/live-started', (request, response) => {
        if (!hasInternalSecret(request)) {
            response.status(401).json({
                success: false,
                message: 'Невалиден вътрешен ключ.',
            });
            return;
        }

        const stream = request.body?.stream as Partial<LiveStreamBroadcastPayload> | undefined;

        if (
            !stream ||
            typeof stream.id !== 'number' ||
            typeof stream.status !== 'string' ||
            !stream.owner ||
            typeof stream.owner.id !== 'number'
        ) {
            response.status(422).json({
                success: false,
                message: 'Невалидни данни за стартирано live предаване.',
            });
            return;
        }

        lives.started(stream as LiveStreamBroadcastPayload);

        response.json({ success: true });
    });

    app.post('/internal/events/live-ended', (request, response) => {
        if (!hasInternalSecret(request)) {
            response.status(401).json({
                success: false,
                message: 'Невалиден вътрешен ключ.',
            });
            return;
        }

        const liveId = Number(request.body?.live_id);

        if (!Number.isInteger(liveId) || liveId <= 0) {
            response.status(422).json({
                success: false,
                message: 'Невалидни данни за приключено live предаване.',
            });
            return;
        }

        lives.end(liveId);

        response.json({ success: true });
    });
}
