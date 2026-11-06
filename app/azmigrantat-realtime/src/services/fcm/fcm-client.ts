import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

import { config } from '../../config';
import type { PushTokenProvider } from './push-token.provider';

export interface FcmDataMessage {
    data: Record<string, string>;
    expiresAt: Date;
    collapseKey: string;
}

export interface FcmSender {
    hasActiveTokenForUser(userId: number): Promise<boolean>;
    sendToUser(userId: number, message: FcmDataMessage): Promise<void>;
}

const permanentTokenErrors = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
]);

export class FirebaseFcmSender implements FcmSender {
    constructor(private readonly tokenProvider: PushTokenProvider) {}

    async hasActiveTokenForUser(userId: number): Promise<boolean> {
        const tokens = await this.tokenProvider.getActiveFcmTokensForUser(userId);
        return tokens.length > 0;
    }

    async sendToUser(userId: number, message: FcmDataMessage): Promise<void> {
        if (message.expiresAt <= new Date()) {
            console.log('[FCM] Message already expired', {
                userId,
            });
            return;
        }

        console.log('[FCM] Fetching tokens', {
            userId,
        });

        const tokens = await this.tokenProvider.getActiveFcmTokensForUser(userId);

        console.log('[FCM] Tokens found', {
            userId,
            count: tokens.length,
        });

        if (tokens.length === 0 || message.expiresAt <= new Date()) {
            console.log('[FCM] Nothing to send', {
                userId,
                tokenCount: tokens.length,
            });

            return;
        }

        const appName = `azmigrantat-realtime-${config.environment}`;
        let firebaseApp = getApps().find((app) => app.name === appName);
        if (!firebaseApp) {
            console.log('[FCM] Initializing Firebase Admin');

            firebaseApp = initializeApp(
                {
                    credential: applicationDefault(),
                    ...(config.firebaseProjectId ? { projectId: config.firebaseProjectId } : {}),
                },
                appName,
            );
        }

        const ttl = Math.max(0, message.expiresAt.getTime() - Date.now());

        console.log('[FCM] Sending message', {
            userId,
            ttl,
            data: message.data,
        });

        for (let offset = 0; offset < tokens.length; offset += 500) {
            const batch = tokens.slice(offset, offset + 500);

            const result = await getMessaging(firebaseApp).sendEachForMulticast({
                tokens: batch.map(({ token }) => token),
                data: message.data,
                android: {
                    priority: 'high',
                    ttl,
                    collapseKey: message.collapseKey,
                },
            });

            console.log('[FCM] Firebase result', {
                userId,
                successCount: result.successCount,
                failureCount: result.failureCount,
            });

            result.responses.forEach((response, index) => {
                if (response.success) {
                    console.log('[FCM] Token success', {
                        tokenIndex: offset + index,
                        messageId: response.messageId,
                    });
                } else {
                    console.error('[FCM] Token failed', {
                        tokenIndex: offset + index,
                        code: response.error?.code,
                        message: response.error?.message,
                    });
                }
            });

            await Promise.all(
                result.responses.map(async (response, index) => {
                    const code = response.error?.code;

                    if (code && permanentTokenErrors.has(code)) {
                        await this.tokenProvider.deactivateToken(batch[index].token, code);
                    }
                }),
            );
        }
    }
}
