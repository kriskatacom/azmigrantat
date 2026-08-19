import type { Socket } from 'socket.io';

import type { CallService } from '../services/calls/call-service';
import type {
    CallAnswerClientPayload,
    CallIceCandidateClientPayload,
    CallOfferClientPayload,
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

function hasValidRecipientAndCall(
    payload: { recipient_id?: unknown; call_id?: unknown } | null | undefined,
): payload is { recipient_id: number; call_id: string } {
    return Boolean(
        payload &&
        Number.isInteger(payload.recipient_id) &&
        Number(payload.recipient_id) > 0 &&
        typeof payload.call_id === 'string' &&
        payload.call_id.trim(),
    );
}

function isValidDescription(
    description: CallOfferClientPayload['description'] | CallAnswerClientPayload['description'],
    expectedType: 'offer' | 'answer',
): boolean {
    return Boolean(
        description &&
        description.type === expectedType &&
        typeof description.sdp === 'string' &&
        description.sdp,
    );
}

function isValidCandidate(candidate: CallIceCandidateClientPayload['candidate']): boolean {
    return Boolean(candidate && typeof candidate.candidate === 'string' && candidate.candidate);
}

export function registerCallEvents(socket: RealtimeSocket, calls: CallService): void {
    socket.on('call:offer', async (payload) => {
        if (
            !hasValidRecipientAndCall(payload) ||
            !isValidDescription(payload.description, 'offer')
        ) {
            return;
        }

        await calls.offer(socket, { ...payload, call_id: payload.call_id.trim() });
    });

    socket.on('call:answer', async (payload) => {
        if (
            !hasValidRecipientAndCall(payload) ||
            !isValidDescription(payload.description, 'answer')
        ) {
            return;
        }

        await calls.answer(socket, { ...payload, call_id: payload.call_id.trim() });
    });

    socket.on('call:ice-candidate', (payload) => {
        if (!hasValidRecipientAndCall(payload) || !isValidCandidate(payload.candidate)) {
            return;
        }

        calls.ice(socket, { ...payload, call_id: payload.call_id.trim() });
    });

    socket.on('call:end', async (payload) => {
        if (!hasValidRecipientAndCall(payload)) {
            return;
        }

        await calls.end(socket, { ...payload, call_id: payload.call_id.trim() });
    });

    socket.on('call:sync', () => {
        calls.replay(socket);
    });

    socket.on('device:register', (payload) => {
        if (payload?.app_state === 'active' || payload?.app_state === 'background') {
            socket.data.appState = payload.app_state;
        }
    });

    socket.on('app:state', (payload) => {
        if (payload?.app_state === 'active' || payload?.app_state === 'background') {
            socket.data.appState = payload.app_state;
        }
    });

    const handshakeState = socket.handshake.auth?.app_state;
    if (handshakeState === 'active' || handshakeState === 'background') {
        socket.data.appState = handshakeState;
    }
}
