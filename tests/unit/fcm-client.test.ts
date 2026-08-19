import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendEachForMulticast } = vi.hoisted(() => ({
    sendEachForMulticast: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({
    applicationDefault: vi.fn(() => ({})),
    getApps: vi.fn(() => [{}]),
    initializeApp: vi.fn(),
}));

vi.mock('firebase-admin/messaging', () => ({
    getMessaging: vi.fn(() => ({ sendEachForMulticast })),
}));

import { FirebaseFcmSender } from '../../src/services/fcm/fcm-client';
import type { PushTokenProvider } from '../../src/services/fcm/push-token.provider';

describe('FirebaseFcmSender', () => {
    beforeEach(() => {
        sendEachForMulticast.mockReset();
    });

    it('fanout-ва data-only high-priority push към всички Android tokens', async () => {
        sendEachForMulticast.mockResolvedValue({
            responses: [{ success: true }, { success: true }],
        });
        const provider = {
            getActiveFcmTokensForUser: vi.fn().mockResolvedValue([
                { token: 'token-1', platform: 'android', provider: 'fcm' },
                { token: 'token-2', platform: 'android', provider: 'fcm' },
            ]),
            deactivateToken: vi.fn(),
        } satisfies PushTokenProvider;
        const sender = new FirebaseFcmSender(provider);
        const expiresAt = new Date(Date.now() + 25_000);

        await sender.sendToUser(44, {
            data: { type: 'call_cancelled', call_id: 'call-1' },
            expiresAt,
            collapseKey: 'call:call-1',
        });

        expect(sendEachForMulticast).toHaveBeenCalledWith({
            tokens: ['token-1', 'token-2'],
            data: { type: 'call_cancelled', call_id: 'call-1' },
            android: {
                priority: 'high',
                ttl: expect.any(Number),
                collapseKey: 'call:call-1',
            },
        });
        expect(sendEachForMulticast.mock.calls[0][0]).not.toHaveProperty('notification');
    });

    it('деактивира permanent invalid token, но запазва transient failure', async () => {
        sendEachForMulticast.mockResolvedValue({
            responses: [
                {
                    success: false,
                    error: { code: 'messaging/registration-token-not-registered' },
                },
                {
                    success: false,
                    error: { code: 'messaging/internal-error' },
                },
            ],
        });
        const provider = {
            getActiveFcmTokensForUser: vi.fn().mockResolvedValue([
                { token: 'invalid-token', platform: 'android', provider: 'fcm' },
                { token: 'transient-token', platform: 'android', provider: 'fcm' },
            ]),
            deactivateToken: vi.fn().mockResolvedValue(undefined),
        } satisfies PushTokenProvider;

        await new FirebaseFcmSender(provider).sendToUser(44, {
            data: { type: 'call_ended', call_id: 'call-1' },
            expiresAt: new Date(Date.now() + 20_000),
            collapseKey: 'call:call-1',
        });

        expect(provider.deactivateToken).toHaveBeenCalledOnce();
        expect(provider.deactivateToken).toHaveBeenCalledWith(
            'invalid-token',
            'messaging/registration-token-not-registered',
        );
    });
});
