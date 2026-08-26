import type { Socket } from 'socket.io';

import type {
    ClientToServerEvents,
    InterServerEvents,
    RealtimeServer,
    ServerToClientEvents,
    SocketData,
} from '../../types/events';
import type {
    LiveCommentPayload,
    LiveReactionType,
    LiveRole,
    LiveStreamBroadcastPayload,
} from '../../types/live';
import type { LiveAuthorizationProvider } from './live-authorization.provider';
import type { LivePersistenceProvider } from './live-persistence.provider';
import { InMemoryLiveStore } from './live-store';

type RealtimeSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

const REACTION_TYPES = new Set<LiveReactionType>(['like', 'heart', 'fire', 'clap', 'wow']);
const VIEWER_COUNT_BROADCAST_MS = 150;
const VIEWER_COUNT_PERSIST_MS = 2_000;

export function liveRoomName(liveId: number): string {
    return `live:${liveId}`;
}

export class LiveService {
    private readonly broadcastTimers = new Map<number, ReturnType<typeof setTimeout>>();
    private readonly persistTimers = new Map<number, ReturnType<typeof setTimeout>>();

    constructor(
        private readonly io: RealtimeServer,
        private readonly store: InMemoryLiveStore,
        private readonly authorizer: LiveAuthorizationProvider,
        private readonly persistence?: LivePersistenceProvider,
    ) {}

    async join(socket: RealtimeSocket, liveId: number): Promise<void> {
        const authorization = await this.authorize(liveId, socket.data.user.id, 'join');

        if (!authorization.authorized || !authorization.role) {
            this.emitError(
                socket,
                liveId,
                'LIVE_JOIN_DENIED',
                'Нямате достъп до това live предаване.',
            );
            return;
        }

        await socket.join(liveRoomName(liveId));
        this.rememberMembership(socket, liveId);
        this.store.join(liveId, socket.id, {
            userId: socket.data.user.id,
            role: authorization.role,
        });
        this.scheduleViewerCount(liveId);
    }

    async leave(socket: RealtimeSocket, liveId: number): Promise<void> {
        await socket.leave(liveRoomName(liveId));
        this.forgetMembership(socket, liveId);
        this.store.leave(liveId, socket.id);
        this.scheduleViewerCount(liveId);
    }

    async comment(socket: RealtimeSocket, liveId: number, body: string): Promise<void> {
        const trimmed = body.trim();

        if (trimmed === '' || trimmed.length > 280) {
            this.emitError(socket, liveId, 'LIVE_COMMENT_INVALID', 'Невалиден коментар.');
            return;
        }

        const authorization = await this.authorize(liveId, socket.data.user.id, 'comment');

        if (!authorization.authorized) {
            this.emitError(socket, liveId, 'LIVE_COMMENT_DENIED', 'Коментарът не е позволен.');
            return;
        }

        if (!this.store.has(liveId, socket.id)) {
            await this.join(socket, liveId);
        }

        if (!this.persistence) {
            return;
        }

        try {
            const comment = await this.persistence.persistComment(
                liveId,
                socket.data.user.id,
                trimmed,
            );

            if (comment) {
                this.broadcastComment(comment);
            }
        } catch (error) {
            console.error('Live comment persist failed:', error);
            this.emitError(
                socket,
                liveId,
                'LIVE_COMMENT_FAILED',
                'Коментарът не можа да бъде записан.',
            );
        }
    }

    async reaction(socket: RealtimeSocket, liveId: number, type: string): Promise<void> {
        if (!REACTION_TYPES.has(type as LiveReactionType)) {
            return;
        }

        const authorization = await this.authorize(liveId, socket.data.user.id, 'reaction');

        if (!authorization.authorized) {
            return;
        }

        this.io.to(liveRoomName(liveId)).emit('live:reaction', {
            live_id: liveId,
            type: type as LiveReactionType,
            user: {
                id: socket.data.user.id,
                name: socket.data.user.name,
            },
        });
    }

    async disconnect(socket: RealtimeSocket): Promise<void> {
        const liveIds = this.store.leaveAll(socket.id);
        socket.data.liveRooms = [];

        for (const liveId of liveIds) {
            this.scheduleViewerCount(liveId);
        }
    }

    broadcastComment(comment: LiveCommentPayload): void {
        this.io.to(liveRoomName(comment.live_id)).emit('live:comment', comment);
    }

    started(stream: LiveStreamBroadcastPayload): void {
        this.io.emit('live:started', { stream });
    }

    end(liveId: number): void {
        this.io.emit('live:ended', { live_id: liveId });
        this.store.clear(liveId);
        this.clearTimers(liveId);

        if ('invalidate' in this.authorizer && typeof this.authorizer.invalidate === 'function') {
            this.authorizer.invalidate(liveId);
        }
    }

    viewerCount(liveId: number): number {
        return this.store.viewerCount(liveId);
    }

    private async authorize(liveId: number, userId: number, action: string) {
        try {
            return await this.authorizer.authorize(liveId, userId, action);
        } catch (error) {
            console.error('Live authorization failed:', error);
            return { authorized: false as const, role: undefined as LiveRole | undefined };
        }
    }

    private scheduleViewerCount(liveId: number): void {
        if (!this.broadcastTimers.has(liveId)) {
            const timer = setTimeout(() => {
                this.broadcastTimers.delete(liveId);
                const viewerCount = this.store.viewerCount(liveId);
                this.io.emit('live:viewer-count', {
                    live_id: liveId,
                    viewer_count: viewerCount,
                });
            }, VIEWER_COUNT_BROADCAST_MS);

            timer.unref?.();
            this.broadcastTimers.set(liveId, timer);
        }

        if (!this.persistence || this.persistTimers.has(liveId)) {
            return;
        }

        const persistTimer = setTimeout(() => {
            this.persistTimers.delete(liveId);
            void this.persistence
                ?.syncViewerCount(liveId, this.store.viewerCount(liveId))
                .catch((error) => {
                    console.error('Live viewer-count sync failed:', error);
                });
        }, VIEWER_COUNT_PERSIST_MS);

        persistTimer.unref?.();
        this.persistTimers.set(liveId, persistTimer);
    }

    private rememberMembership(socket: RealtimeSocket, liveId: number): void {
        const rooms = new Set(socket.data.liveRooms ?? []);
        rooms.add(liveId);
        socket.data.liveRooms = [...rooms];
    }

    private forgetMembership(socket: RealtimeSocket, liveId: number): void {
        socket.data.liveRooms = (socket.data.liveRooms ?? []).filter((id) => id !== liveId);
    }

    private emitError(
        socket: RealtimeSocket,
        liveId: number | null,
        code: string,
        message: string,
    ): void {
        socket.emit('live:error', { live_id: liveId, code, message });
    }

    private clearTimers(liveId: number): void {
        const broadcast = this.broadcastTimers.get(liveId);
        const persist = this.persistTimers.get(liveId);

        if (broadcast) {
            clearTimeout(broadcast);
            this.broadcastTimers.delete(liveId);
        }

        if (persist) {
            clearTimeout(persist);
            this.persistTimers.delete(liveId);
        }
    }
}
