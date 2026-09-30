import type { Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';

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
    LiveTalkRequestAcceptedPayload,
    LiveTalkRequestPayload,
    LiveTalkRequestStatus,
} from '../../types/live';
import type { LiveAuthorizationProvider } from './live-authorization.provider';
import type { LivePersistenceProvider } from './live-persistence.provider';
import { InMemoryLiveStore } from './live-store';
import type { MediaNodeManager } from '../media/media-node-manager';

type RealtimeSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

const REACTION_TYPES = new Set<LiveReactionType>([
    'like',
    'heart',
    'fire',
    'clap',
    'wow',
    'laugh',
    'sad',
    'angry',
    'party',
    'rocket',
    'cool',
    'kiss',
    'wink',
    'surprised',
    'cry',
    'scream',
    'poop',
    'sparkles',
    'star',
    'pray',
]);
const VIEWER_COUNT_BROADCAST_MS = 150;
const VIEWER_COUNT_PERSIST_MS = 2_000;
const TALK_REQUEST_TTL_MS = 60_000;

type TalkRequest = {
    requestId: string;
    liveId: number;
    viewerSocketId: string;
    viewer: { id: number; name: string; profile_image?: string | null };
    status: LiveTalkRequestStatus;
    mediaSession?: Record<string, unknown>;
    expiresAt: number;
};

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
        private readonly mediaNodes?: MediaNodeManager,
    ) {}

    private readonly talkRequests = new Map<string, TalkRequest>();
    private readonly activeSpeakers = new Map<number, string>();

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

    async cameraState(socket: RealtimeSocket, liveId: number, enabled: boolean): Promise<void> {
        const authorization = await this.authorize(liveId, socket.data.user.id, 'join');
        if (
            !authorization.authorized ||
            (authorization.role !== 'streamer' && authorization.role !== 'viewer')
        ) {
            return;
        }

        this.io.to(liveRoomName(liveId)).emit('live:camera-state', {
            live_id: liveId,
            user_id: socket.data.user.id,
            camera_enabled: enabled,
        });
    }

    async requestToSpeak(socket: RealtimeSocket, liveId: number): Promise<void> {
        const authorization = await this.authorize(liveId, socket.data.user.id, 'talk_request');
        if (!authorization.authorized || authorization.role !== 'viewer') {
            this.emitError(
                socket,
                liveId,
                'LIVE_TALK_REQUEST_DENIED',
                'Нямате право да поискате да говорите.',
            );
            return;
        }

        if (!this.store.has(liveId, socket.id)) {
            await this.join(socket, liveId);
        }

        if (this.activeSpeakers.has(liveId)) {
            this.emitError(socket, liveId, 'LIVE_SPEAKER_BUSY', 'Вече има одобрен говорещ.');
            return;
        }

        const existing = [...this.talkRequests.values()].find(
            (request) =>
                request.liveId === liveId &&
                request.viewerSocketId === socket.id &&
                request.status === 'pending',
        );
        if (existing) {
            this.emitTalkRequestUpdate(socket.id, existing);
            return;
        }

        const request: TalkRequest = {
            requestId: randomUUID(),
            liveId,
            viewerSocketId: socket.id,
            viewer: {
                id: socket.data.user.id,
                name: socket.data.user.name,
                profile_image: socket.data.user.avatar ?? null,
            },
            status: 'pending',
            expiresAt: Date.now() + TALK_REQUEST_TTL_MS,
        };
        this.talkRequests.set(request.requestId, request);

        const streamerSocketId = this.store.socketIdForRole(liveId, 'streamer');
        if (!streamerSocketId) {
            this.updateTalkRequest(request, 'expired');
            this.emitError(
                socket,
                liveId,
                'LIVE_STREAMER_UNAVAILABLE',
                'Предаващият не е наличен.',
            );
            return;
        }

        this.emitTalkRequestUpdate(socket.id, request);
        this.io.to(streamerSocketId).emit('live:talk-request:received', this.talkPayload(request));
    }

    async acceptTalkRequest(
        socket: RealtimeSocket,
        liveId: number,
        requestId: string,
    ): Promise<void> {
        const authorization = await this.authorize(liveId, socket.data.user.id, 'talk_accept');
        const request = this.talkRequests.get(requestId);
        if (
            !authorization.authorized ||
            authorization.role !== 'streamer' ||
            !request ||
            request.liveId !== liveId ||
            request.status !== 'pending'
        ) {
            this.emitError(
                socket,
                liveId,
                'LIVE_TALK_REQUEST_INVALID',
                'Заявката за говорене не е валидна.',
            );
            return;
        }
        if (request.expiresAt <= Date.now()) {
            this.updateTalkRequest(request, 'expired');
            return;
        }
        if (this.activeSpeakers.has(liveId)) {
            this.emitError(socket, liveId, 'LIVE_SPEAKER_BUSY', 'Вече има одобрен говорещ.');
            return;
        }
        if (!this.mediaNodes) {
            this.emitError(
                socket,
                liveId,
                'LIVE_MEDIA_UNAVAILABLE',
                'Media услугата не е налична.',
            );
            return;
        }

        try {
            request.mediaSession = await this.mediaNodes.createSession(
                liveId,
                'speaker',
                request.viewer.id,
            );
            request.status = 'accepted';
            this.activeSpeakers.set(liveId, request.requestId);
            const payload: LiveTalkRequestAcceptedPayload = {
                ...this.talkPayload(request),
                status: 'accepted',
                media_session: request.mediaSession,
            };
            this.io.to(request.viewerSocketId).emit('live:talk-request:updated', payload);
            socket.emit('live:talk-request:updated', payload);
        } catch (error) {
            console.error('Live talk request media session failed:', error);
            this.emitError(
                socket,
                liveId,
                'LIVE_MEDIA_UNAVAILABLE',
                'Говоренето не можа да бъде активирано.',
            );
        }
    }

    async rejectTalkRequest(
        socket: RealtimeSocket,
        liveId: number,
        requestId: string,
    ): Promise<void> {
        const authorization = await this.authorize(liveId, socket.data.user.id, 'talk_accept');
        const request = this.talkRequests.get(requestId);
        if (
            !authorization.authorized ||
            authorization.role !== 'streamer' ||
            !request ||
            request.liveId !== liveId ||
            request.status !== 'pending'
        ) {
            this.emitError(
                socket,
                liveId,
                'LIVE_TALK_REQUEST_INVALID',
                'Заявката за говорене не е валидна.',
            );
            return;
        }

        this.updateTalkRequest(request, 'rejected');
        socket.emit('live:talk-request:updated', this.talkPayload(request));
    }

    async cancelTalkRequest(
        socket: RealtimeSocket,
        liveId: number,
        requestId?: string,
    ): Promise<void> {
        const authorization = await this.authorize(liveId, socket.data.user.id, 'talk_accept');
        if (authorization.authorized && authorization.role === 'streamer') {
            const request = requestId ? this.talkRequests.get(requestId) : undefined;
            if (!request || request.liveId !== liveId || request.status !== 'accepted') {
                this.emitError(
                    socket,
                    liveId,
                    'LIVE_TALK_REQUEST_INVALID',
                    'Активният разговор не е намерен.',
                );
                return;
            }

            this.updateTalkRequest(request, 'cancelled');
            return;
        }

        const request = [...this.talkRequests.values()].find(
            (item) =>
                item.liveId === liveId &&
                item.viewerSocketId === socket.id &&
                (item.status === 'pending' || item.status === 'accepted') &&
                (!requestId || item.requestId === requestId),
        );
        if (!request) return;

        this.updateTalkRequest(request, 'cancelled');
    }

    async disconnect(socket: RealtimeSocket): Promise<void> {
        for (const request of [...this.talkRequests.values()]) {
            if (
                request.viewerSocketId === socket.id &&
                (request.status === 'pending' || request.status === 'accepted')
            ) {
                this.updateTalkRequest(request, 'cancelled');
            }
        }
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
        for (const request of [...this.talkRequests.values()]) {
            if (request.liveId === liveId) {
                this.updateTalkRequest(request, 'expired');
            }
        }
        this.activeSpeakers.delete(liveId);
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

    private updateTalkRequest(request: TalkRequest, status: LiveTalkRequestStatus): void {
        request.status = status;
        if (
            status !== 'pending' &&
            status !== 'accepted' &&
            request.mediaSession &&
            this.mediaNodes
        ) {
            void this.mediaNodes
                .closeSession(request.liveId, request.mediaSession)
                .catch((error) => {
                    console.error('[live] failed to close speaker media session', error);
                });
        }
        this.emitTalkRequestUpdate(request.viewerSocketId, request);
        const streamerSocketId = this.store.socketIdForRole(request.liveId, 'streamer');
        if (streamerSocketId) {
            this.io
                .to(streamerSocketId)
                .emit('live:talk-request:updated', this.talkPayload(request));
        }
        if (status !== 'pending' && status !== 'accepted') {
            this.talkRequests.delete(request.requestId);
            if (this.activeSpeakers.get(request.liveId) === request.requestId) {
                this.activeSpeakers.delete(request.liveId);
            }
        }
    }

    private emitTalkRequestUpdate(socketId: string, request: TalkRequest): void {
        this.io.to(socketId).emit('live:talk-request:updated', this.talkPayload(request));
    }

    private talkPayload(request: TalkRequest): LiveTalkRequestPayload {
        return {
            request_id: request.requestId,
            live_id: request.liveId,
            status: request.status,
            viewer: request.viewer,
        };
    }
}
