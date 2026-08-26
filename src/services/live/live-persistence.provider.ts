import { config } from '../../config';

import type { LiveCommentPayload } from '../../types/live';

export interface LivePersistenceProvider {
    persistComment(
        liveId: number,
        userId: number,
        body: string,
    ): Promise<LiveCommentPayload | null>;
    syncViewerCount(liveId: number, viewerCount: number): Promise<void>;
}

export class PhpLivePersistenceProvider implements LivePersistenceProvider {
    async persistComment(
        liveId: number,
        userId: number,
        body: string,
    ): Promise<LiveCommentPayload | null> {
        const response = await fetch(`${config.phpApiUrl}/internal/mobile/lives/comments`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Internal-Secret': config.internalApiSecret,
            },
            body: JSON.stringify({
                live_id: liveId,
                user_id: userId,
                body,
            }),
            signal: AbortSignal.timeout(5_000),
        });

        if (!response.ok) {
            throw new Error(`PHP live comment persist failed with HTTP ${response.status}.`);
        }

        const payload = (await response.json()) as {
            success?: unknown;
            comment?: LiveCommentPayload;
        };

        return payload.success === true && payload.comment ? payload.comment : null;
    }

    async syncViewerCount(liveId: number, viewerCount: number): Promise<void> {
        const response = await fetch(`${config.phpApiUrl}/internal/mobile/lives/viewer-count`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Internal-Secret': config.internalApiSecret,
            },
            body: JSON.stringify({
                live_id: liveId,
                viewer_count: viewerCount,
            }),
            signal: AbortSignal.timeout(5_000),
        });

        if (!response.ok) {
            throw new Error(`PHP live viewer-count sync failed with HTTP ${response.status}.`);
        }
    }
}
