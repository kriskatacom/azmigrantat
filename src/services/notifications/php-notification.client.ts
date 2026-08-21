import { config } from '../../config';

export interface MissedVideoCallInput {
    callId: string;
    callerId: number;
    recipientId: number;
    callerName: string;
    callerAvatar?: string | null;
    conversationId?: number;
}

export interface MissedCallRecorder {
    recordMissedVideoCall(input: MissedVideoCallInput): Promise<void>;
}

export class PhpNotificationClient implements MissedCallRecorder {
    async recordMissedVideoCall(input: MissedVideoCallInput): Promise<void> {
        const body: Record<string, unknown> = {
            call_id: input.callId,
            caller_id: input.callerId,
            recipient_id: input.recipientId,
            caller_name: input.callerName,
        };

        if (input.callerAvatar) {
            body.caller_avatar = input.callerAvatar;
        }

        if (input.conversationId !== undefined) {
            body.conversation_id = input.conversationId;
        }

        const response = await fetch(
            `${config.phpApiUrl}/internal/mobile/notifications/missed-video-call`,
            {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Internal-Secret': config.internalApiSecret,
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(10_000),
            },
        );

        if (!response.ok) {
            throw new Error(`PHP missed-call notification failed with HTTP ${response.status}.`);
        }
    }
}
