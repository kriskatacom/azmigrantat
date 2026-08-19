import { config } from '../config';
import type { CallEndReason, CallSession, CallType } from '../types/call';
import { pushTokenStore } from './push-token.store';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CALL_TTL_SECONDS = 35;

type ExpoPushMessage = {
    to: string;
    title?: string;
    body?: string;
    sound?: string;
    ttl?: number;
    expiration?: number;
    priority?: 'default' | 'normal' | 'high';
    channelId?: string;
    categoryId?: string;
    interruptionLevel?: 'passive' | 'active' | 'timeSensitive' | 'critical';
    _contentAvailable?: boolean;
    data: Record<string, string | number | boolean | null>;
};

async function fetchPhpPushTokens(userId: number): Promise<string[]> {
    try {
        const response = await fetch(`${config.phpApiUrl}/internal/users/${userId}/push-tokens`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'X-Internal-Secret': config.internalApiSecret,
            },
            signal: AbortSignal.timeout(8_000),
        });

        if (!response.ok) {
            return [];
        }

        const data = (await response.json()) as { tokens?: unknown };

        if (!Array.isArray(data.tokens)) {
            return [];
        }

        return data.tokens.filter(
            (token): token is string =>
                typeof token === 'string' &&
                (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')),
        );
    } catch {
        return [];
    }
}

async function getPushTokens(userId: number): Promise<string[]> {
    const [storedTokens, phpTokens] = await Promise.all([
        pushTokenStore.get(userId),
        fetchPhpPushTokens(userId),
    ]);

    return [...new Set([...storedTokens, ...phpTokens])];
}

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
    if (messages.length === 0) {
        return;
    }

    for (let index = 0; index < messages.length; index += 100) {
        const chunk = messages.slice(index, index + 100);

        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chunk),
                signal: AbortSignal.timeout(10_000),
            });

            if (!response.ok) {
                const body = await response.text();
                console.error(`Expo push грешка ${response.status}: ${body.slice(0, 300)}`);
            }
        } catch (error) {
            console.error('Неуспешно изпращане на Expo push:', error);
        }
    }
}

function sessionToIncomingData(session: CallSession): ExpoPushMessage['data'] {
    return {
        type: 'incoming_call',
        call_id: session.call_id,
        caller_id: session.caller_id,
        caller_name: session.caller_name,
        caller_avatar: session.caller_avatar,
        call_type: session.call_type,
        timestamp: session.created_at,
    };
}

export async function sendIncomingCallPush(session: CallSession): Promise<void> {
    const tokens = await getPushTokens(session.recipient_id);

    if (tokens.length === 0) {
        console.log(`Няма push token за входящо обаждане към потребител ${session.recipient_id}.`);
        return;
    }

    const expiration = Math.floor((session.created_at + CALL_TTL_SECONDS * 1000) / 1000);

    await sendExpoPush(
        tokens.map((token) => ({
            to: token,
            title: session.caller_name || 'Входящо обаждане',
            body: 'Входящо видео обаждане',
            sound: 'incoming_call.wav',
            ttl: CALL_TTL_SECONDS,
            expiration,
            priority: 'high',
            channelId: 'incoming_calls',
            categoryId: 'incoming_call',
            interruptionLevel: 'timeSensitive',
            data: sessionToIncomingData(session),
        })),
    );

    console.log(
        `Изпратен incoming-call push към потребител ${session.recipient_id} (${tokens.length} token(s)).`,
    );
}

export async function sendIncomingCallEndedPush(
    session: CallSession,
    reason: CallEndReason,
): Promise<void> {
    const tokens = await getPushTokens(session.recipient_id);

    if (tokens.length === 0) {
        return;
    }

    await sendExpoPush(
        tokens.map((token) => ({
            to: token,
            priority: 'high',
            ttl: 20,
            _contentAvailable: true,
            data: {
                type: 'incoming_call_ended',
                call_id: session.call_id,
                caller_id: session.caller_id,
                call_type: session.call_type as CallType,
                reason,
                timestamp: Date.now(),
            },
        })),
    );
}
