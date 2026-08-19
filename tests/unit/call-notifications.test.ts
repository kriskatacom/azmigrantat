import { describe, expect, it, vi } from 'vitest';

import { CallNotifications } from '../../src/services/fcm/call-notifications';
import type { FcmSender } from '../../src/services/fcm/fcm-client';

describe('CallNotifications', () => {
    it('създава data-only incoming payload само със string стойности и без SDP/secrets', async () => {
        const sendToUser = vi.fn().mockResolvedValue(undefined);
        const notifications = new CallNotifications({ sendToUser } as FcmSender);
        const expiresAt = new Date('2026-08-17T12:34:56.000Z');

        await notifications.sendIncomingCallPush({
            recipientId: 44,
            callId: 'call-1',
            callerId: 22,
            callerName: 'Caller',
            callerAvatar: 'https://cdn.example/avatar.jpg',
            conversationId: 91,
            expiresAt,
            timestamp: expiresAt.getTime() - 30_000,
        });

        expect(sendToUser).toHaveBeenCalledWith(44, {
            data: {
                type: 'incoming_call',
                call_id: 'call-1',
                caller_id: '22',
                caller_name: 'Caller',
                caller_avatar: 'https://cdn.example/avatar.jpg',
                call_type: 'video',
                timestamp: String(expiresAt.getTime() - 30_000),
                conversation_id: '91',
                expires_at: '2026-08-17T12:34:56.000Z',
            },
            expiresAt,
            collapseKey: 'call:call-1',
        });
        const message = sendToUser.mock.calls[0][1];
        expect(message.data).not.toHaveProperty('sdp');
        expect(message.data).not.toHaveProperty('access_token');
        expect(Object.values(message.data).every((value) => typeof value === 'string')).toBe(true);
    });

    it('създава ended payload за cancel и end', async () => {
        const sendToUser = vi.fn().mockResolvedValue(undefined);
        const notifications = new CallNotifications({ sendToUser } as FcmSender);
        await notifications.sendCallCancelledPush(44, 'call-1');
        await notifications.sendCallEndedPush(44, 'call-1');
        expect(sendToUser.mock.calls[0][1].data).toEqual({
            type: 'incoming_call_ended',
            call_id: 'call-1',
            reason: 'cancelled',
        });
        expect(sendToUser.mock.calls[1][1].data).toEqual({
            type: 'incoming_call_ended',
            call_id: 'call-1',
            reason: 'ended',
        });
    });
});
