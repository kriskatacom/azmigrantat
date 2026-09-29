import type { Socket } from 'socket.io';

import type { LiveService } from '../services/live/live-service';
import type {
    ClientToServerEvents,
    InterServerEvents,
    ServerToClientEvents,
    SocketData,
} from '../types/events';

type RealtimeSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

function parseLiveId(payload: { live_id?: unknown } | null | undefined): number | null {
    const liveId = Number(payload?.live_id);

    if (!Number.isInteger(liveId) || liveId <= 0) {
        return null;
    }

    return liveId;
}

export function registerLiveEvents(socket: RealtimeSocket, lives: LiveService): void {
    socket.on('live:join', (payload) => {
        const liveId = parseLiveId(payload);

        if (liveId === null) {
            return;
        }

        void lives.join(socket, liveId);
    });

    socket.on('live:leave', (payload) => {
        const liveId = parseLiveId(payload);

        if (liveId === null) {
            return;
        }

        void lives.leave(socket, liveId);
    });

    socket.on('live:comment', (payload) => {
        const liveId = parseLiveId(payload);

        if (liveId === null || typeof payload?.body !== 'string') {
            return;
        }

        void lives.comment(socket, liveId, payload.body);
    });

    socket.on('live:reaction', (payload) => {
        const liveId = parseLiveId(payload);

        if (liveId === null || typeof payload?.type !== 'string') {
            return;
        }

        void lives.reaction(socket, liveId, payload.type);
    });

    socket.on('live:talk-request', (payload) => {
        const liveId = parseLiveId(payload);
        if (liveId === null) return;
        void lives.requestToSpeak(socket, liveId);
    });

    socket.on('live:talk-request:accept', (payload) => {
        const liveId = parseLiveId(payload);
        if (liveId === null || typeof payload?.request_id !== 'string') return;
        void lives.acceptTalkRequest(socket, liveId, payload.request_id);
    });

    socket.on('live:talk-request:reject', (payload) => {
        const liveId = parseLiveId(payload);
        if (liveId === null || typeof payload?.request_id !== 'string') return;
        void lives.rejectTalkRequest(socket, liveId, payload.request_id);
    });

    socket.on('live:talk-request:cancel', (payload) => {
        const liveId = parseLiveId(payload);
        if (liveId === null) return;
        void lives.cancelTalkRequest(socket, liveId, payload.request_id);
    });
}
