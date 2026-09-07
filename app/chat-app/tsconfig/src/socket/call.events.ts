import type { Socket } from 'socket.io';

import { callSessionStore } from '../services/call-session.store';
import { sendIncomingCallEndedPush, sendIncomingCallPush } from '../services/expo-push.service';
import { pushTokenStore } from '../services/push-token.store';
import {
    CALL_NO_ANSWER_MS,
    isNonEmptyString,
    isPositiveInteger,
    statusForEndReason,
    type AppStatePayload,
    type CallClientPayload,
    type CallDescription,
    type CallEndReason,
    type CallIceCandidate,
    type CallServerPayload,
    type CallSession,
    type CallStatePayload,
    type DeviceRegisterPayload,
} from '../types/call';
import type {
    ClientToServerEvents,
    InterServerEvents,
    RealtimeServer,
    ServerToClientEvents,
    SocketData,
} from '../types/events';

type RealtimeSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

function userRoom(userId: number): string {
    return `user:${userId}`;
}

function isOfferDescription(value: CallDescription | undefined): value is CallDescription {
    return Boolean(value && value.type === 'offer' && isNonEmptyString(value.sdp));
}

function isAnswerDescription(value: CallDescription | undefined): value is CallDescription {
    return Boolean(value && value.type === 'answer' && isNonEmptyString(value.sdp));
}

function isIceCandidate(value: CallIceCandidate | undefined): value is CallIceCandidate {
    return Boolean(value && isNonEmptyString(value.candidate));
}

function toIncomingPayload(session: CallSession, senderId: number): CallServerPayload {
    return {
        call_id: session.call_id,
        sender_id: senderId,
        description: session.offer,
        caller_name: session.caller_name,
        caller_avatar: session.caller_avatar,
        call_type: session.call_type,
        timestamp: session.created_at,
    };
}

function buildCallState(session: CallSession | undefined, userId: number): CallStatePayload {
    if (!session || session.recipient_id !== userId || session.status !== 'ringing') {
        return {
            call: null,
            pending_ice_candidates: [],
            status: 'idle',
        };
    }

    return {
        call: toIncomingPayload(session, session.caller_id),
        pending_ice_candidates: session.ice_candidates
            .filter((record) => record.sender_id === session.caller_id)
            .map((record) => record.candidate),
        status: session.status,
    };
}

async function recipientNeedsPush(io: RealtimeServer, recipientId: number): Promise<boolean> {
    const sockets = await io.in(userRoom(recipientId)).fetchSockets();

    if (sockets.length === 0) {
        return true;
    }

    return sockets.every((socket) => socket.data.appState !== 'active');
}

async function emitToUser(
    io: RealtimeServer,
    userId: number,
    event: keyof ServerToClientEvents,
    payload: CallServerPayload,
): Promise<void> {
    io.to(userRoom(userId)).emit(event, payload);
}

function clearSessionTimeout(session: CallSession): void {
    callSessionStore.clearTimeout(session);
}

function scheduleNoAnswerTimeout(io: RealtimeServer, callId: string): void {
    const timer = setTimeout(() => {
        void timeoutCall(io, callId);
    }, CALL_NO_ANSWER_MS);

    callSessionStore.setTimeoutTimer(callId, timer);
}

async function timeoutCall(io: RealtimeServer, callId: string): Promise<void> {
    const session = callSessionStore.get(callId);

    if (!session || session.status !== 'ringing') {
        return;
    }

    await finishCall(io, session, 'timeout', session.caller_id);
}

export async function finishCall(
    io: RealtimeServer,
    session: CallSession,
    reason: CallEndReason,
    senderId: number,
): Promise<void> {
    if (session.status !== 'ringing' && session.status !== 'accepted') {
        return;
    }

    const nextStatus = statusForEndReason(reason);
    const wasRinging = session.status === 'ringing';

    clearSessionTimeout(session);
    callSessionStore.updateStatus(session.call_id, nextStatus);

    const payload: CallServerPayload = {
        call_id: session.call_id,
        sender_id: senderId,
        reason,
        call_type: session.call_type,
        timestamp: Date.now(),
    };

    await Promise.all([
        emitToUser(io, session.caller_id, 'call:end', payload),
        emitToUser(io, session.recipient_id, 'call:end', payload),
    ]);

    if (wasRinging) {
        void sendIncomingCallEndedPush(session, reason);
    }

    console.log(`call:${nextStatus} ${session.call_id} reason=${reason}`);
}

async function handleOffer(
    io: RealtimeServer,
    socket: RealtimeSocket,
    payload: CallClientPayload,
): Promise<void> {
    const caller = socket.data.user;

    if (
        !isNonEmptyString(payload?.call_id) ||
        !isPositiveInteger(payload?.recipient_id) ||
        payload.recipient_id === caller.id ||
        !isOfferDescription(payload.description)
    ) {
        return;
    }

    const existing = callSessionStore.get(payload.call_id);

    if (existing) {
        if (existing.caller_id === caller.id && existing.status === 'ringing') {
            existing.offer = payload.description;
            await emitToUser(
                io,
                existing.recipient_id,
                'call:offer',
                toIncomingPayload(existing, caller.id),
            );
        }

        return;
    }

    const created = callSessionStore.create({
        call_id: payload.call_id,
        caller_id: caller.id,
        recipient_id: payload.recipient_id,
        offer: payload.description,
        caller_name: caller.name || 'Потребител',
        caller_avatar: caller.avatar ?? null,
    });

    if (!created) {
        socket.emit('call:end', {
            call_id: payload.call_id,
            sender_id: payload.recipient_id,
            reason: 'busy',
            timestamp: Date.now(),
        });
        return;
    }

    scheduleNoAnswerTimeout(io, created.call_id);

    const offerPayload = toIncomingPayload(created, caller.id);
    await emitToUser(io, created.recipient_id, 'call:offer', offerPayload);

    if (await recipientNeedsPush(io, created.recipient_id)) {
        void sendIncomingCallPush(created);
    }

    console.log(`call:offer ${created.call_id} ${caller.id} → ${created.recipient_id}`);
}

async function handleAnswer(
    io: RealtimeServer,
    socket: RealtimeSocket,
    payload: CallClientPayload,
): Promise<void> {
    const user = socket.data.user;
    const session = isNonEmptyString(payload?.call_id)
        ? callSessionStore.get(payload.call_id)
        : undefined;

    if (
        !session ||
        session.recipient_id !== user.id ||
        session.status !== 'ringing' ||
        !isAnswerDescription(payload.description)
    ) {
        return;
    }

    clearSessionTimeout(session);
    callSessionStore.updateStatus(session.call_id, 'accepted');

    const answerPayload: CallServerPayload = {
        call_id: session.call_id,
        sender_id: user.id,
        description: payload.description,
        call_type: session.call_type,
        timestamp: Date.now(),
    };

    socket.to(userRoom(session.caller_id)).emit('call:answer', answerPayload);
    socket.to(userRoom(session.recipient_id)).emit('call:end', {
        call_id: session.call_id,
        sender_id: user.id,
        reason: 'answered_elsewhere',
        timestamp: Date.now(),
    });

    void sendIncomingCallEndedPush(session, 'answered_elsewhere');

    console.log(`call:answer ${session.call_id} ${user.id} → ${session.caller_id}`);
}

async function handleIceCandidate(
    io: RealtimeServer,
    socket: RealtimeSocket,
    payload: CallClientPayload,
): Promise<void> {
    const user = socket.data.user;
    const session = isNonEmptyString(payload?.call_id)
        ? callSessionStore.get(payload.call_id)
        : undefined;

    if (!session || !isIceCandidate(payload.candidate)) {
        return;
    }

    if (user.id !== session.caller_id && user.id !== session.recipient_id) {
        return;
    }

    if (session.status !== 'ringing' && session.status !== 'accepted') {
        return;
    }

    callSessionStore.addIceCandidate(session.call_id, user.id, payload.candidate);

    const targetId = user.id === session.caller_id ? session.recipient_id : session.caller_id;

    await emitToUser(io, targetId, 'call:ice-candidate', {
        call_id: session.call_id,
        sender_id: user.id,
        candidate: payload.candidate,
        call_type: session.call_type,
        timestamp: Date.now(),
    });
}

async function handleEnd(
    io: RealtimeServer,
    socket: RealtimeSocket,
    payload: CallClientPayload,
): Promise<void> {
    const user = socket.data.user;
    const session = isNonEmptyString(payload?.call_id)
        ? callSessionStore.get(payload.call_id)
        : undefined;

    if (!session) {
        return;
    }

    const isParticipant = user.id === session.caller_id || user.id === session.recipient_id;

    if (!isParticipant) {
        return;
    }

    if (payload.reason === 'answered_elsewhere' || payload.reason === 'rejected_elsewhere') {
        socket.to(userRoom(user.id)).emit('call:end', {
            call_id: session.call_id,
            sender_id: user.id,
            reason: payload.reason,
            timestamp: Date.now(),
        });
        return;
    }

    const reason: CallEndReason = payload.reason ?? 'hangup';
    await finishCall(io, session, reason, user.id);
}

async function handleDeviceRegister(
    socket: RealtimeSocket,
    payload: DeviceRegisterPayload,
): Promise<void> {
    if (payload?.app_state === 'active' || payload?.app_state === 'background') {
        socket.data.appState = payload.app_state;
    }

    if (isNonEmptyString(payload?.expo_push_token)) {
        socket.data.expoPushToken = payload.expo_push_token.trim();
        await pushTokenStore.register(socket.data.user.id, socket.data.expoPushToken);
    }
}

function handleAppState(socket: RealtimeSocket, payload: AppStatePayload): void {
    if (payload?.app_state === 'active' || payload?.app_state === 'background') {
        socket.data.appState = payload.app_state;
    }
}

export function replayPendingIncomingCall(socket: RealtimeSocket): void {
    const session = callSessionStore.getActiveForUser(socket.data.user.id);

    if (!session || session.recipient_id !== socket.data.user.id || session.status !== 'ringing') {
        socket.emit('call:state', buildCallState(undefined, socket.data.user.id));
        return;
    }

    const state = buildCallState(session, socket.data.user.id);
    socket.emit('call:state', state);

    if (state.call) {
        socket.emit('call:offer', state.call);

        for (const candidate of state.pending_ice_candidates) {
            socket.emit('call:ice-candidate', {
                call_id: session.call_id,
                sender_id: session.caller_id,
                candidate,
                call_type: session.call_type,
                timestamp: session.created_at,
            });
        }
    }
}

export function registerCallEvents(io: RealtimeServer, socket: RealtimeSocket): void {
    const authAppState = socket.handshake.auth?.app_state;
    const authPushToken = socket.handshake.auth?.expo_push_token;

    if (authAppState === 'active' || authAppState === 'background') {
        socket.data.appState = authAppState;
    } else {
        socket.data.appState = 'active';
    }

    if (typeof authPushToken === 'string' && authPushToken.trim()) {
        socket.data.expoPushToken = authPushToken.trim();
        void pushTokenStore.register(socket.data.user.id, socket.data.expoPushToken);
    }

    socket.on('call:offer', (payload) => {
        void handleOffer(io, socket, payload);
    });
    socket.on('call:answer', (payload) => {
        void handleAnswer(io, socket, payload);
    });
    socket.on('call:ice-candidate', (payload) => {
        void handleIceCandidate(io, socket, payload);
    });
    socket.on('call:end', (payload) => {
        void handleEnd(io, socket, payload);
    });
    socket.on('call:sync', () => {
        replayPendingIncomingCall(socket);
    });
    socket.on('device:register', (payload) => {
        void handleDeviceRegister(socket, payload);
    });
    socket.on('app:state', (payload) => {
        handleAppState(socket, payload);
    });

    replayPendingIncomingCall(socket);
}
