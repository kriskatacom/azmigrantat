import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LiveAuthorizationProvider } from '../../src/services/live/live-authorization.provider';
import type { LivePersistenceProvider } from '../../src/services/live/live-persistence.provider';
import { LiveService } from '../../src/services/live/live-service';
import { InMemoryLiveStore } from '../../src/services/live/live-store';
import type { RealtimeServer } from '../../src/types/events';

function createHarness() {
    const roomEmit = vi.fn();
    const emit = vi.fn();
    const io = {
        emit,
        to: vi.fn((room: string) => ({
            emit: (event: string, payload: unknown) => roomEmit(room, event, payload),
        })),
    } as unknown as RealtimeServer;

    const authorizer: LiveAuthorizationProvider = {
        authorize: vi.fn(async () => ({
            authorized: true,
            role: 'viewer' as const,
            status: 'live',
            liveId: 9,
        })),
    };

    const persistence: LivePersistenceProvider = {
        persistComment: vi.fn(async () => ({
            id: 1,
            live_id: 9,
            body: 'здравей',
            created_at: '2026-08-26T00:00:00.000Z',
            user: { id: 7, name: 'Krisi' },
        })),
        syncViewerCount: vi.fn(async () => undefined),
    };

    const store = new InMemoryLiveStore();
    const lives = new LiveService(io, store, authorizer, persistence);

    function socket(userId: number, name = 'User') {
        const emit = vi.fn();
        const join = vi.fn(async () => undefined);
        const leave = vi.fn(async () => undefined);

        return {
            id: `socket-${userId}`,
            data: {
                user: { id: userId, name, role: 'user', is_active: true },
                liveRooms: [] as number[],
            },
            emit,
            join,
            leave,
        };
    }

    return { lives, store, authorizer, persistence, roomEmit, emit, socket };
}

describe('InMemoryLiveStore', () => {
    it('брои уникални зрители, без streamer-а', () => {
        const store = new InMemoryLiveStore();
        store.join(4, 's1', { userId: 1, role: 'streamer' });
        store.join(4, 'v1', { userId: 2, role: 'viewer' });
        store.join(4, 'v2', { userId: 2, role: 'viewer' });
        store.join(4, 'v3', { userId: 3, role: 'viewer' });

        expect(store.viewerCount(4)).toBe(2);
    });
});

describe('LiveService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('слага socket в live room след успешен join', async () => {
        const { lives, authorizer, socket } = createHarness();
        const viewer = socket(7);

        await lives.join(viewer as never, 9);

        expect(authorizer.authorize).toHaveBeenCalledWith(9, 7, 'join');
        expect(viewer.join).toHaveBeenCalledWith('live:9');
        expect(viewer.data.liveRooms).toEqual([9]);
    });

    it('не пуска join при отказана авторизация', async () => {
        const { lives, authorizer, socket } = createHarness();
        authorizer.authorize = vi.fn(async () => ({ authorized: false }));
        const viewer = socket(7);

        await lives.join(viewer as never, 9);

        expect(viewer.join).not.toHaveBeenCalled();
        expect(viewer.emit).toHaveBeenCalledWith('live:error', {
            live_id: 9,
            code: 'LIVE_JOIN_DENIED',
            message: 'Нямате достъп до това live предаване.',
        });
    });

    it('broadcast-ва коментар към live room', async () => {
        const { lives, persistence, roomEmit, socket } = createHarness();
        const viewer = socket(7, 'Krisi');
        await lives.join(viewer as never, 9);

        await lives.comment(viewer as never, 9, 'здравей');

        expect(persistence.persistComment).toHaveBeenCalledWith(9, 7, 'здравей');
        expect(roomEmit).toHaveBeenCalledWith('live:9', 'live:comment', {
            id: 1,
            live_id: 9,
            body: 'здравей',
            created_at: '2026-08-26T00:00:00.000Z',
            user: { id: 7, name: 'Krisi' },
        });
    });

    it('излъчва live:ended към всички свързани клиенти и чисти occupancy', async () => {
        const { lives, store, emit, socket } = createHarness();
        const viewer = socket(7);
        await lives.join(viewer as never, 9);

        lives.end(9);

        expect(emit).toHaveBeenCalledWith('live:ended', { live_id: 9 });
        expect(store.viewerCount(9)).toBe(0);
    });

    it('излъчва live:started към всички свързани клиенти', () => {
        const { lives, emit } = createHarness();
        const stream = {
            id: 9,
            title: 'Тест',
            status: 'live',
            media_provider: 'mock',
            media_room_id: 'live-9',
            viewer_count: 0,
            started_at: '2026-08-26T00:00:00.000Z',
            ended_at: null,
            created_at: '2026-08-26T00:00:00.000Z',
            owner: { id: 1, name: 'Krisi' },
        };

        lives.started(stream);

        expect(emit).toHaveBeenCalledWith('live:started', { stream });
    });
});
