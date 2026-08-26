import { config } from '../../config';

import type { LiveRole } from '../../types/live';

export interface LiveAuthorization {
    authorized: boolean;
    role?: LiveRole;
    status?: string;
    liveId?: number;
    mediaRoomId?: string | null;
    mediaProvider?: string | null;
}

export interface LiveAuthorizationProvider {
    authorize(liveId: number, userId: number, action: string): Promise<LiveAuthorization>;
}

export class PhpLiveAuthorizationProvider implements LiveAuthorizationProvider {
    private readonly cache = new Map<string, { expiresAt: number; value: LiveAuthorization }>();

    async authorize(liveId: number, userId: number, action: string): Promise<LiveAuthorization> {
        if (!Number.isInteger(liveId) || liveId <= 0 || !Number.isInteger(userId) || userId <= 0) {
            return { authorized: false };
        }

        const cacheKey = `${liveId}:${userId}:${action}`;
        const cached = this.cache.get(cacheKey);

        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }

        const response = await fetch(`${config.phpApiUrl}/internal/mobile/lives/authorize`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Internal-Secret': config.internalApiSecret,
            },
            body: JSON.stringify({
                live_id: liveId,
                user_id: userId,
                action,
            }),
            signal: AbortSignal.timeout(5_000),
        });

        if (!response.ok) {
            throw new Error(`PHP live authorization failed with HTTP ${response.status}.`);
        }

        const payload = (await response.json()) as {
            authorized?: unknown;
            role?: unknown;
            status?: unknown;
            live_id?: unknown;
            media_room_id?: unknown;
            media_provider?: unknown;
        };

        const value: LiveAuthorization = {
            authorized: payload.authorized === true,
            role:
                payload.role === 'streamer' || payload.role === 'viewer' ? payload.role : undefined,
            status: typeof payload.status === 'string' ? payload.status : undefined,
            liveId: Number.isInteger(payload.live_id) ? Number(payload.live_id) : undefined,
            mediaRoomId: typeof payload.media_room_id === 'string' ? payload.media_room_id : null,
            mediaProvider:
                typeof payload.media_provider === 'string' ? payload.media_provider : null,
        };

        this.cache.set(cacheKey, {
            value,
            expiresAt: Date.now() + 5_000,
        });

        return value;
    }

    invalidate(liveId: number): void {
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${liveId}:`)) {
                this.cache.delete(key);
            }
        }
    }
}
