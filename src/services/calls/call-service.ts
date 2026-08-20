import type { Socket } from 'socket.io';

import type { CallNotifications } from '../fcm/call-notifications';
import type { CallAuthorizationProvider } from './call-authorization.provider';
import type {
    CallAcceptClientPayload,
    CallAnswerClientPayload,
    CallEndClientPayload,
    CallIceCandidateClientPayload,
    CallOfferClientPayload,
    CallOfferServerPayload,
    CallStatePayload,
    ClientToServerEvents,
    InterServerEvents,
    RealtimeServer,
    ServerToClientEvents,
    SocketData,
} from '../../types/events';
import type { CallStore, PendingCall } from './call-store';

type RealtimeSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

const CALL_TTL_MS = 30_000;

export class CallService {
    constructor(
        private readonly io: RealtimeServer,
        private readonly store: CallStore,
        private readonly notifications?: CallNotifications,
        private readonly authorization?: CallAuthorizationProvider,
        private readonly now: () => Date = () => new Date(),
    ) {}

    async offer(socket: RealtimeSocket, payload: CallOfferClientPayload): Promise<void> {
        const caller = socket.data.user;
        if (caller.id === payload.recipient_id) return;

        let conversationId: number | undefined;
        if (this.authorization) {
            try {
                const authorization = await this.authorization.authorizeCall(
                    caller.id,
                    payload.recipient_id,
                );
                if (!authorization.authorized) return;
                conversationId = authorization.conversationId;
            } catch (error) {
                console.error('Call authorization failed:', error);
                return;
            }
        }

        const createdAt = this.now();
        const call: PendingCall = {
            callId: payload.call_id,
            callerId: caller.id,
            callerName: caller.name,
            callerAvatar: caller.avatar ?? null,
            recipientId: payload.recipient_id,
            status: 'pending',
            createdAt,
            expiresAt: new Date(createdAt.getTime() + CALL_TTL_MS),
            offer: payload.description,
            ...(conversationId !== undefined ? { conversationId } : {}),
            bufferedIce: [],
        };

        if (!this.store.create(call)) {
            console.log('[CALL] created skipped duplicate', { callId: call.callId });
            return;
        }

        console.log('[CALL] created', {
            callId: call.callId,
            callerId: call.callerId,
            recipientId: call.recipientId,
            conversationId: call.conversationId,
            expiresAt: call.expiresAt.toISOString(),
        });

        socket.to(`user:${call.recipientId}`).emit('call:offer', this.toIncomingPayload(call));
        console.log('[CALL] socket delivered', {
            callId: call.callId,
            recipientId: call.recipientId,
        });

        await this.sendIncomingPush(call);
    }

    async answer(socket: RealtimeSocket, payload: CallAnswerClientPayload): Promise<void> {
        const call = this.store.get(payload.call_id);
        if (
            !call ||
            call.recipientId !== socket.data.user.id ||
            call.callerId !== payload.recipient_id
        ) {
            return;
        }

        if (call.status === 'pending') {
            if (call.expiresAt <= this.now()) return;
            if (!this.store.claim(call.callId, 'pending', 'accepted')) return;
            console.log('[CALL] server state ringing -> accepted callId=' + call.callId);
            const event = {
                call_id: call.callId,
                sender_id: socket.data.user.id,
            };
            this.io.to(`user:${call.callerId}`).emit('call:accepted', event);
            this.io.to(`user:${call.recipientId}`).emit('call:accepted', event);
        } else if (call.status !== 'accepted') {
            return;
        }

        if (call.answered) {
            return;
        }

        call.answered = true;

        console.log('[CALL] accepted', {
            callId: call.callId,
            recipientId: socket.data.user.id,
        });

        socket.to(`user:${call.callerId}`).emit('call:answer', {
            call_id: call.callId,
            sender_id: socket.data.user.id,
            description: payload.description,
        });

        socket.to(`user:${call.recipientId}`).emit('call:end', {
            call_id: call.callId,
            sender_id: socket.data.user.id,
            reason: 'answered_elsewhere',
        });
        await this.notify(() =>
            this.notifications?.sendCallEndedPush(
                call.recipientId,
                call.callId,
                'answered_elsewhere',
            ),
        );
    }

    async acceptIntent(socket: RealtimeSocket, payload: CallAcceptClientPayload): Promise<void> {
        const call = this.store.get(payload.call_id);
        if (
            !call ||
            call.recipientId !== socket.data.user.id ||
            call.callerId !== payload.recipient_id
        ) {
            return;
        }

        const alreadyAccepted = call.status === 'accepted';
        if (call.status === 'pending') {
            if (call.expiresAt <= this.now()) return;
            if (!this.store.claim(call.callId, 'pending', 'accepted')) return;
            console.log('[CALL] server state ringing -> accepted callId=' + call.callId);
        } else if (alreadyAccepted) {
            console.log('[CALL] ignoring duplicate accepted transition', { callId: call.callId });
        } else {
            return;
        }

        const event = {
            call_id: call.callId,
            sender_id: socket.data.user.id,
        };
        this.io.to(`user:${call.callerId}`).emit('call:accepted', event);
        this.io.to(`user:${call.recipientId}`).emit('call:accepted', event);

        if (!alreadyAccepted) {
            socket.to(`user:${call.recipientId}`).emit('call:end', {
                call_id: call.callId,
                sender_id: socket.data.user.id,
                reason: 'answered_elsewhere',
            });
        }
    }

    ice(socket: RealtimeSocket, payload: CallIceCandidateClientPayload): void {
        const call = this.store.get(payload.call_id);
        if (!call) return;
        if (call.status === 'pending' && call.expiresAt <= this.now()) return;

        const senderId = socket.data.user.id;
        const validDirection =
            (senderId === call.callerId && payload.recipient_id === call.recipientId) ||
            (senderId === call.recipientId && payload.recipient_id === call.callerId);

        if (!validDirection || !['pending', 'accepted'].includes(call.status)) return;

        if (
            (call.status === 'pending' || call.status === 'accepted') &&
            senderId === call.callerId
        ) {
            this.store.addIce(call.callId, payload.candidate);
        }

        socket.to(`user:${payload.recipient_id}`).emit('call:ice-candidate', {
            call_id: call.callId,
            sender_id: senderId,
            candidate: payload.candidate,
        });
    }

    async end(socket: RealtimeSocket, payload: CallEndClientPayload): Promise<void> {
        const call = this.store.get(payload.call_id);
        if (!call) return;

        const senderId = socket.data.user.id;
        if (
            ![call.callerId, call.recipientId].includes(senderId) ||
            ![call.callerId, call.recipientId].includes(payload.recipient_id) ||
            senderId === payload.recipient_id
        ) {
            return;
        }

        const reason = payload.reason?.trim();
        await this.finish(call, senderId, reason, { excludeSocket: socket });
    }

    async declineByUser(
        userId: number,
        callId: string,
    ): Promise<
        { ok: true; status: 'declined' | 'ended' } | { ok: false; status: number; message: string }
    > {
        const call = this.store.get(callId);

        if (!call) {
            return { ok: true, status: 'ended' };
        }

        if (call.callerId !== userId && call.recipientId !== userId) {
            return { ok: false, status: 403, message: 'Нямате достъп до това обаждане.' };
        }

        if (call.status !== 'pending') {
            return { ok: true, status: 'ended' };
        }

        await this.finish(call, userId, 'rejected');
        console.log('[CALL] declined', { callId: call.callId, userId });
        return { ok: true, status: 'declined' };
    }

    async acceptByUser(
        userId: number,
        callId: string,
    ): Promise<
        { ok: true; status: 'accepted' | 'ended' } | { ok: false; status: number; message: string }
    > {
        const call = this.store.get(callId);

        if (!call) {
            return { ok: true, status: 'ended' };
        }

        if (call.callerId !== userId && call.recipientId !== userId) {
            return { ok: false, status: 403, message: 'Нямате достъп до това обаждане.' };
        }

        if (call.status === 'accepted') {
            return { ok: true, status: 'accepted' };
        }

        if (call.status !== 'pending') {
            return { ok: true, status: 'ended' };
        }

        if (call.recipientId !== userId) {
            return { ok: false, status: 403, message: 'Нямате достъп до това обаждане.' };
        }

        if (!this.store.claim(call.callId, 'pending', 'accepted')) {
            return { ok: true, status: 'ended' };
        }

        console.log('[CALL] accepted', { callId: call.callId, userId, source: 'http' });
        const event = { call_id: call.callId, sender_id: userId };
        this.io.to(`user:${call.callerId}`).emit('call:accepted', event);
        this.io.to(`user:${call.recipientId}`).emit('call:accepted', event);
        this.io.to(`user:${call.recipientId}`).emit('call:end', {
            call_id: call.callId,
            sender_id: userId,
            reason: 'answered_elsewhere',
        });
        await this.notify(() =>
            this.notifications?.sendCallEndedPush(
                call.recipientId,
                call.callId,
                'answered_elsewhere',
            ),
        );
        return { ok: true, status: 'accepted' };
    }

    getRingingForRecipient(userId: number): {
        call: CallOfferServerPayload | null;
        pending_ice_candidates: CallStatePayload['pending_ice_candidates'];
        status: CallStatePayload['status'];
    } {
        const call = this.store
            .findIncomingForRecipient(userId, this.now())
            .find((item) => item.offer);

        if (!call?.offer) {
            return { call: null, pending_ice_candidates: [], status: 'idle' };
        }

        const apiStatus = this.toApiStatus(call);
        return {
            call: this.toIncomingPayload(call),
            pending_ice_candidates: call.bufferedIce,
            status: apiStatus === 'accepted' || apiStatus === 'active' ? 'accepted' : 'ringing',
        };
    }

    getCallForUser(
        userId: number,
        callId: string,
    ): {
        call: CallOfferServerPayload | null;
        pending_ice_candidates: CallStatePayload['pending_ice_candidates'];
        status: string;
    } {
        const call = this.store.get(callId);

        if (!call || (call.callerId !== userId && call.recipientId !== userId)) {
            return { call: null, pending_ice_candidates: [], status: 'ended' };
        }

        const includeMedia = call.status === 'pending' || call.status === 'accepted';
        return {
            call: call.offer ? this.toIncomingPayload(call) : null,
            pending_ice_candidates: includeMedia ? call.bufferedIce : [],
            status: this.toApiStatus(call),
        };
    }

    replay(socket: RealtimeSocket): void {
        const ringing = this.getRingingForRecipient(socket.data.user.id);
        const status = ringing.status;

        console.log('[CALL] receiver opened app', {
            userId: socket.data.user.id,
            callId: ringing.call?.call_id ?? null,
            status,
        });
        socket.emit('call:state', {
            call: ringing.call,
            pending_ice_candidates: ringing.pending_ice_candidates,
            status,
        });

        if (!ringing.call) {
            return;
        }

        if (status === 'accepted') {
            socket.emit('call:accepted', {
                call_id: ringing.call.call_id,
                sender_id: socket.data.user.id,
            });
        }

        socket.emit('call:offer', ringing.call);
        for (const candidate of ringing.pending_ice_candidates) {
            socket.emit('call:ice-candidate', {
                call_id: ringing.call.call_id,
                sender_id: ringing.call.sender_id,
                candidate,
            });
        }
    }

    async expirePendingCalls(): Promise<void> {
        const now = this.now();
        for (const call of this.store.getExpiredPending(now)) await this.expire(call);
    }

    private async expire(call: PendingCall): Promise<void> {
        if (!this.store.transition(call.callId, 'pending', 'expired')) return;
        console.log('[CALL] timeout', { callId: call.callId });
        this.io.to(`user:${call.callerId}`).emit('call:end', {
            call_id: call.callId,
            sender_id: call.recipientId,
            reason: 'timeout',
        });
        this.io.to(`user:${call.recipientId}`).emit('call:end', {
            call_id: call.callId,
            sender_id: call.callerId,
            reason: 'timeout',
        });
        await this.notify(() =>
            this.notifications?.sendCallCancelledPush(call.recipientId, call.callId, 'timeout'),
        );
    }

    private async finish(
        call: PendingCall,
        senderId: number,
        reason: string | undefined,
        options: { excludeSocket?: RealtimeSocket } = {},
    ): Promise<boolean> {
        const nextStatus =
            call.status === 'pending' && reason === 'cancelled'
                ? 'cancelled'
                : call.status === 'pending' && reason === 'rejected'
                  ? 'rejected'
                  : 'ended';
        const transitioned = this.store.transition(call.callId, call.status, nextStatus);
        if (!transitioned) return false;

        const event = { call_id: call.callId, sender_id: senderId, ...(reason ? { reason } : {}) };
        const rooms = new Set([`user:${call.callerId}`, `user:${call.recipientId}`]);

        if (options.excludeSocket) {
            const excludedRecipient =
                options.excludeSocket.data.user.id === call.callerId
                    ? call.recipientId
                    : call.callerId;
            options.excludeSocket.to(`user:${excludedRecipient}`).emit('call:end', event);

            if (senderId === call.recipientId) {
                options.excludeSocket.to(`user:${call.recipientId}`).emit('call:end', event);
            }
        } else {
            for (const room of rooms) {
                this.io.to(room).emit('call:end', event);
            }
        }

        if (nextStatus === 'cancelled') {
            console.log('[CALL] cancelled', { callId: call.callId, senderId });
        } else if (nextStatus === 'rejected') {
            console.log('[CALL] declined', { callId: call.callId, senderId });
        } else {
            console.log('[CALL] ended', { callId: call.callId, senderId, reason });
        }

        await this.notify(() =>
            nextStatus === 'cancelled'
                ? this.notifications?.sendCallCancelledPush(
                      call.recipientId,
                      call.callId,
                      reason ?? 'cancelled',
                  )
                : this.notifications?.sendCallEndedPush(
                      call.recipientId,
                      call.callId,
                      reason ?? 'ended',
                  ),
        );

        return true;
    }

    private toIncomingPayload(call: PendingCall): CallOfferServerPayload {
        return {
            call_id: call.callId,
            sender_id: call.callerId,
            description: call.offer!,
            caller_name: call.callerName,
            caller_avatar: call.callerAvatar ?? null,
            call_type: 'video',
            timestamp: call.createdAt.getTime(),
        };
    }

    private toApiStatus(call: PendingCall): string {
        if (call.status === 'pending') return 'ringing';
        if (call.status === 'accepted') return call.answered ? 'active' : 'accepted';
        if (call.status === 'rejected') return 'declined';
        if (call.status === 'expired') return 'timeout';
        return call.status;
    }

    private async sendIncomingPush(call: PendingCall): Promise<void> {
        const notifications = this.notifications;
        if (!notifications) {
            console.warn('[CALL] push skipped, notification service is not configured');
            return;
        }

        await this.notify(async () => {
            try {
                await notifications.sendIncomingCallPush({
                    recipientId: call.recipientId,
                    callId: call.callId,
                    callerId: call.callerId,
                    callerName: call.callerName,
                    callerAvatar: call.callerAvatar,
                    ...(call.conversationId !== undefined
                        ? { conversationId: call.conversationId }
                        : {}),
                    expiresAt: call.expiresAt,
                    timestamp: call.createdAt.getTime(),
                });
                console.log('[CALL] push sent', {
                    callId: call.callId,
                    recipientId: call.recipientId,
                });
            } catch (error) {
                console.error('[CALL] push failed', {
                    callId: call.callId,
                    recipientId: call.recipientId,
                    error,
                });
                throw error;
            }
        });
    }

    private async notify(operation: () => Promise<void> | undefined): Promise<void> {
        try {
            const result = operation();

            if (!result) {
                console.warn('[CALL] push skipped, notification service is not configured');
                return;
            }

            await result;
        } catch (error) {
            console.error('[CALL] push failed:', error);
        }
    }
}
