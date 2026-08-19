import { config } from '../../config';

export interface CallAuthorization {
    authorized: boolean;
    conversationId?: number;
}

export interface CallAuthorizationProvider {
    authorizeCall(callerId: number, recipientId: number): Promise<CallAuthorization>;
}

export class PhpCallAuthorizationProvider implements CallAuthorizationProvider {
    async authorizeCall(callerId: number, recipientId: number): Promise<CallAuthorization> {
        const response = await fetch(`${config.phpApiUrl}/internal/mobile/calls/authorize`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Internal-Secret': config.internalApiSecret,
            },
            body: JSON.stringify({ caller_id: callerId, recipient_id: recipientId }),
            signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
            throw new Error(`PHP call authorization failed with HTTP ${response.status}.`);
        }

        const payload = (await response.json()) as {
            success?: unknown;
            authorized?: unknown;
            conversation_id?: unknown;
        };

        return {
            authorized: payload.success === true && payload.authorized === true,
            ...(Number.isInteger(payload.conversation_id)
                ? { conversationId: Number(payload.conversation_id) }
                : {}),
        };
    }
}
