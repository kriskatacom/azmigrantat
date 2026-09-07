import { config } from '../../config';
import type { FcmToken, PushTokenProvider } from './push-token.provider';

interface TokenLookupResponse {
    success: true;
    tokens: Array<{
        token?: string;
        platform?: string;
        provider?: string;
    }>;
}

export class PhpPushTokenProvider implements PushTokenProvider {
    async getActiveFcmTokensForUser(userId: number): Promise<FcmToken[]> {
        const response = await fetch(
            `${config.phpApiUrl}/internal/mobile/push-tokens?user_id=${userId}`,
            {
                headers: {
                    Accept: 'application/json',
                    'X-Internal-Secret': config.internalApiSecret,
                },
                signal: AbortSignal.timeout(10_000),
            },
        );

        if (!response.ok) {
            throw new Error(`PHP FCM token lookup failed with HTTP ${response.status}.`);
        }

        const payload = (await response.json()) as Partial<TokenLookupResponse>;

        if (!payload.success || !Array.isArray(payload.tokens)) {
            throw new Error('PHP FCM token lookup returned an invalid response.');
        }

        return payload.tokens
            .filter((item): item is { token: string; platform?: string; provider?: string } => {
                if (typeof item?.token !== 'string' || !item.token.trim()) {
                    return false;
                }

                if (item.platform !== 'android') {
                    return false;
                }

                if (item.token.startsWith('ExponentPushToken')) {
                    return false;
                }

                return item.provider === 'fcm' || item.provider === undefined;
            })
            .map((item) => ({
                token: item.token,
                platform: 'android' as const,
                provider: 'fcm' as const,
            }));
    }

    async deactivateToken(token: string, reason: string): Promise<void> {
        const response = await fetch(`${config.phpApiUrl}/internal/mobile/push-tokens/deactivate`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Internal-Secret': config.internalApiSecret,
            },
            body: JSON.stringify({ token, provider: 'fcm', reason }),
            signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
            throw new Error(`PHP FCM token deactivation failed with HTTP ${response.status}.`);
        }
    }
}
