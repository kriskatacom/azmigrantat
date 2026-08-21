import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CallService } from '../../src/services/calls/call-service';
import { InMemoryCallStore } from '../../src/services/calls/call-store';
import type { CallNotifications } from '../../src/services/fcm/call-notifications';
import type { RealtimeServer } from '../../src/types/events';

const offer = { type: 'offer' as const, sdp: 'secret-offer-sdp' };
const answer = { type: 'answer' as const, sdp: 'answer-sdp' };
const candidate = {
    candidate: 'candidate:1',
    sdpMid: '0',
    sdpMLineIndex: 0,
};

function createHarness(initialNow = new Date('2026-08-17T12:00:00.000Z')) {
    let now = initialNow;
    const roomEmit = vi.fn();
    const io = {
        to: vi.fn((room: string) => ({
            emit: (event: string, payload: unknown) => roomEmit(room, event, payload),
        })),
    } as unknown as RealtimeServer;
    const notifications = {
        sendIncomingCallPush: vi.fn().mockResolvedValue(undefined),
        sendCallCancelledPush: vi.fn().mockResolvedValue(undefined),
        sendCallEndedPush: vi.fn().mockResolvedValue(undefined),
    } as unknown as CallNotifications;
    const missedCalls = {
        recordMissedVideoCall: vi.fn().mockResolvedValue(undefined),
        recordCallEvent: vi.fn().mockResolvedValue(undefined),
    };
    const store = new InMemoryCallStore();
    const calls = new CallService(io, store, notifications, undefined, () => now, missedCalls);

    function socket(userId: number, name: string) {
        const socketEmit = vi.fn();
        const toEmit = vi.fn();
        const value = {
            data: {
                user: { id: userId, name, role: 'user', is_active: true },
            },
            emit: socketEmit,
            to: vi.fn((room: string) => ({
                emit: (event: string, payload: unknown) => toEmit(room, event, payload),
            })),
        } as unknown as Parameters<CallService['offer']>[0];
        return { value, socketEmit, toEmit };
    }

    return {
        calls,
        store,
        notifications,
        missedCalls,
        roomEmit,
        socket,
        setNow(value: Date) {
            now = value;
        },
    };
}

describe('CallService', () => {
    let harness: ReturnType<typeof createHarness>;

    beforeEach(() => {
        harness = createHarness();
    });

    it('запазва offer, запазва socket delivery и изпраща trusted FCM payload', async () => {
        const caller = harness.socket(22, 'Trusted Caller');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });

        expect(caller.toEmit).toHaveBeenCalledWith('user:44', 'call:offer', {
            call_id: 'call-1',
            sender_id: 22,
            description: offer,
            caller_name: 'Trusted Caller',
            caller_avatar: null,
            call_type: 'video',
            timestamp: new Date('2026-08-17T12:00:00.000Z').getTime(),
        });
        expect(harness.notifications.sendIncomingCallPush).toHaveBeenCalledTimes(1);
        expect(harness.notifications.sendIncomingCallPush).toHaveBeenCalledWith({
            recipientId: 44,
            callId: 'call-1',
            callerId: 22,
            callerName: 'Trusted Caller',
            callerAvatar: null,
            callType: 'video',
            expiresAt: new Date('2026-08-17T12:00:30.000Z'),
            timestamp: new Date('2026-08-17T12:00:00.000Z').getTime(),
        });
        expect(harness.store.get('call-1')?.offer).toEqual(offer);
    });

    it('препраща call:camera-state към другия участник', async () => {
        const caller = harness.socket(22, 'Caller');
        const recipient = harness.socket(44, 'Recipient');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });
        await harness.calls.answer(recipient.value, {
            call_id: 'call-1',
            recipient_id: 22,
            description: answer,
        });

        harness.roomEmit.mockClear();
        harness.calls.cameraState(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            enabled: false,
        });

        expect(harness.store.get('call-1')?.cameraEnabled).toBe(false);
        expect(harness.roomEmit).toHaveBeenCalledWith('user:44', 'call:camera-state', {
            call_id: 'call-1',
            sender_id: 22,
            enabled: false,
        });
    });

    it('връща ringing state за HTTP restore и decline-ва през HTTP', async () => {
        const caller = harness.socket(22, 'Caller');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });

        expect(harness.calls.getRingingForRecipient(44).call?.call_id).toBe('call-1');
        expect(harness.calls.getRingingForRecipient(22).call).toBeNull();

        const declined = await harness.calls.declineByUser(44, 'call-1');
        expect(declined).toEqual({ ok: true, status: 'declined' });
        expect(harness.store.get('call-1')?.status).toBe('rejected');
        expect(harness.notifications.sendCallEndedPush).toHaveBeenCalledWith(
            44,
            'call-1',
            'rejected',
        );
        expect(harness.missedCalls.recordMissedVideoCall).not.toHaveBeenCalled();
    });

    it('HTTP accept спира timeout и пази offer за restore', async () => {
        const caller = harness.socket(22, 'Caller');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });

        const accepted = await harness.calls.acceptByUser(44, 'call-1');
        expect(accepted).toEqual({ ok: true, status: 'accepted' });
        expect(harness.store.get('call-1')?.status).toBe('accepted');
        expect(harness.roomEmit).toHaveBeenCalledWith('user:22', 'call:accepted', {
            call_id: 'call-1',
            sender_id: 44,
        });
        expect(harness.roomEmit).toHaveBeenCalledWith('user:44', 'call:accepted', {
            call_id: 'call-1',
            sender_id: 44,
        });
        expect(harness.store.get('call-1')?.offer).toEqual(offer);
        expect(harness.calls.getCallForUser(44, 'call-1')).toEqual({
            call: expect.objectContaining({ call_id: 'call-1' }),
            pending_ice_candidates: [],
            status: 'accepted',
        });
        expect(harness.calls.getRingingForRecipient(44).call?.call_id).toBe('call-1');

        harness.setNow(new Date('2026-08-17T12:00:31.000Z'));
        await harness.calls.expirePendingCalls();
        expect(harness.store.get('call-1')?.status).toBe('accepted');
        expect(harness.missedCalls.recordMissedVideoCall).not.toHaveBeenCalled();

        const recipient = harness.socket(44, 'Recipient');
        await harness.calls.answer(recipient.value, {
            call_id: 'call-1',
            recipient_id: 22,
            description: answer,
        });
        expect(recipient.toEmit).toHaveBeenCalledWith('user:22', 'call:answer', {
            call_id: 'call-1',
            sender_id: 44,
            description: answer,
        });
    });

    it('не позволява caller == recipient', async () => {
        const caller = harness.socket(22, 'Caller');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 22,
            description: offer,
        });
        expect(caller.toEmit).not.toHaveBeenCalled();
        expect(harness.notifications.sendIncomingCallPush).not.toHaveBeenCalled();
    });

    it('replay-ва offer и buffered ICE в правилния ред', async () => {
        const caller = harness.socket(22, 'Caller');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });
        harness.calls.ice(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            candidate,
        });

        const recipient = harness.socket(44, 'Recipient');
        harness.calls.replay(recipient.value);
        expect(recipient.socketEmit.mock.calls.map(([event]) => event)).toEqual([
            'call:state',
            'call:offer',
            'call:ice-candidate',
        ]);
    });

    it('не replay-ва expired offer и игнорира stale ICE', async () => {
        const caller = harness.socket(22, 'Caller');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });
        harness.setNow(new Date('2026-08-17T12:00:31.000Z'));
        harness.calls.ice(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            candidate,
        });
        const recipient = harness.socket(44, 'Recipient');
        harness.calls.replay(recipient.value);
        expect(recipient.socketEmit).toHaveBeenCalledWith('call:state', {
            call: null,
            pending_ice_candidates: [],
            status: 'idle',
        });
        expect(recipient.socketEmit).not.toHaveBeenCalledWith('call:offer', expect.anything());
    });

    it('само първият answer печели при две устройства', async () => {
        const caller = harness.socket(22, 'Caller');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });
        const deviceOne = harness.socket(44, 'Recipient');
        const deviceTwo = harness.socket(44, 'Recipient');
        const payload = { call_id: 'call-1', recipient_id: 22, description: answer };
        await Promise.all([
            harness.calls.answer(deviceOne.value, payload),
            harness.calls.answer(deviceTwo.value, payload),
        ]);
        expect(deviceOne.toEmit.mock.calls.length + deviceTwo.toEmit.mock.calls.length).toBe(2);
        expect(harness.notifications.sendCallEndedPush).toHaveBeenCalledTimes(1);
    });

    it('caller cancel изпраща call_cancelled само веднъж', async () => {
        const caller = harness.socket(22, 'Caller');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });
        const payload = { call_id: 'call-1', recipient_id: 44, reason: 'cancelled' };
        await harness.calls.end(caller.value, payload);
        await harness.calls.end(caller.value, payload);
        expect(harness.notifications.sendCallCancelledPush).toHaveBeenCalledTimes(1);
        expect(harness.missedCalls.recordMissedVideoCall).toHaveBeenCalledTimes(1);
        expect(harness.missedCalls.recordMissedVideoCall).toHaveBeenCalledWith({
            callId: 'call-1',
            callerId: 22,
            recipientId: 44,
            callerName: 'Caller',
            callerAvatar: null,
        });
    });

    it('recipient cancel на pending call не създава missed notification', async () => {
        const caller = harness.socket(22, 'Caller');
        const recipient = harness.socket(44, 'Recipient');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });
        await harness.calls.end(recipient.value, {
            call_id: 'call-1',
            recipient_id: 22,
            reason: 'cancelled',
        });
        expect(harness.missedCalls.recordMissedVideoCall).not.toHaveBeenCalled();
    });

    it('client timeout върху pending call създава missed notification само веднъж', async () => {
        const caller = harness.socket(22, 'Caller');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });
        const payload = { call_id: 'call-1', recipient_id: 44, reason: 'timeout' };
        await harness.calls.end(caller.value, payload);
        await harness.calls.end(caller.value, payload);
        await harness.calls.expirePendingCalls();
        expect(harness.store.get('call-1')?.status).toBe('ended');
        expect(harness.missedCalls.recordMissedVideoCall).toHaveBeenCalledTimes(1);
        expect(harness.missedCalls.recordMissedVideoCall).toHaveBeenCalledWith({
            callId: 'call-1',
            callerId: 22,
            recipientId: 44,
            callerName: 'Caller',
            callerAvatar: null,
        });
    });

    it('authoritative timeout печели срещу късен answer', async () => {
        const caller = harness.socket(22, 'Caller');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });
        harness.setNow(new Date('2026-08-17T12:00:31.000Z'));
        await harness.calls.expirePendingCalls();
        const recipient = harness.socket(44, 'Recipient');
        await harness.calls.answer(recipient.value, {
            call_id: 'call-1',
            recipient_id: 22,
            description: answer,
        });
        expect(harness.store.get('call-1')?.status).toBe('expired');
        expect(recipient.toEmit).not.toHaveBeenCalled();
        expect(harness.notifications.sendCallCancelledPush).toHaveBeenCalledTimes(1);
        expect(harness.missedCalls.recordMissedVideoCall).toHaveBeenCalledTimes(1);
        expect(harness.missedCalls.recordMissedVideoCall).toHaveBeenCalledWith({
            callId: 'call-1',
            callerId: 22,
            recipientId: 44,
            callerName: 'Caller',
            callerAvatar: null,
        });
        await harness.calls.expirePendingCalls();
        expect(harness.missedCalls.recordMissedVideoCall).toHaveBeenCalledTimes(1);
    });

    it('cancel и answer race допуска само първия terminal transition', async () => {
        const caller = harness.socket(22, 'Caller');
        const recipient = harness.socket(44, 'Recipient');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });

        await Promise.all([
            harness.calls.end(caller.value, {
                call_id: 'call-1',
                recipient_id: 44,
                reason: 'cancelled',
            }),
            harness.calls.answer(recipient.value, {
                call_id: 'call-1',
                recipient_id: 22,
                description: answer,
            }),
        ]);

        expect(harness.store.get('call-1')?.status).toBe('cancelled');
        expect(harness.notifications.sendCallCancelledPush).toHaveBeenCalledTimes(1);
        expect(harness.notifications.sendCallEndedPush).not.toHaveBeenCalled();
        expect(harness.missedCalls.recordMissedVideoCall).toHaveBeenCalledTimes(1);
    });

    it('broadcast-ва call:accepted към caller и receiver и е idempotent', async () => {
        const caller = harness.socket(22, 'Caller');
        const recipient = harness.socket(44, 'Recipient');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
        });

        await harness.calls.acceptIntent(recipient.value, {
            call_id: 'call-1',
            recipient_id: 22,
        });

        expect(harness.store.get('call-1')?.status).toBe('accepted');
        expect(harness.roomEmit).toHaveBeenCalledWith('user:22', 'call:accepted', {
            call_id: 'call-1',
            sender_id: 44,
        });
        expect(harness.roomEmit).toHaveBeenCalledWith('user:44', 'call:accepted', {
            call_id: 'call-1',
            sender_id: 44,
        });
        expect(recipient.toEmit).toHaveBeenCalledWith('user:44', 'call:end', {
            call_id: 'call-1',
            sender_id: 44,
            reason: 'answered_elsewhere',
        });

        recipient.toEmit.mockClear();
        harness.roomEmit.mockClear();

        await harness.calls.acceptIntent(recipient.value, {
            call_id: 'call-1',
            recipient_id: 22,
        });

        expect(harness.store.get('call-1')?.status).toBe('accepted');
        expect(harness.roomEmit).toHaveBeenCalledWith('user:22', 'call:accepted', {
            call_id: 'call-1',
            sender_id: 44,
        });
        expect(recipient.toEmit).not.toHaveBeenCalled();

        harness.calls.replay(recipient.value);
        expect(recipient.socketEmit).toHaveBeenCalledWith(
            'call:state',
            expect.objectContaining({
                call: expect.objectContaining({ call_id: 'call-1' }),
                status: 'accepted',
            }),
        );
        expect(recipient.socketEmit).toHaveBeenCalledWith('call:accepted', {
            call_id: 'call-1',
            sender_id: 44,
        });
    });

    it('записва детайлите на обаждането в чата при край', async () => {
        const caller = harness.socket(22, 'Caller');
        const recipient = harness.socket(44, 'Recipient');
        await harness.calls.offer(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            description: offer,
            call_type: 'video',
        });

        await harness.calls.acceptIntent(recipient.value, {
            call_id: 'call-1',
            recipient_id: 22,
        });

        harness.setNow(new Date('2026-08-17T12:01:25.000Z'));
        await harness.calls.end(caller.value, {
            call_id: 'call-1',
            recipient_id: 44,
            reason: 'hangup',
        });

        expect(harness.missedCalls.recordCallEvent).toHaveBeenCalledWith({
            callId: 'call-1',
            callerId: 22,
            recipientId: 44,
            callType: 'video',
            outcome: 'completed',
            startedAt: '2026-08-17T12:00:00.000Z',
            endedAt: '2026-08-17T12:01:25.000Z',
            answeredAt: '2026-08-17T12:00:00.000Z',
            durationSeconds: 85,
            endedById: 22,
            reason: 'hangup',
            cameraEnabled: true,
        });
    });
});
