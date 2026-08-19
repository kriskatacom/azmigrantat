import type { FcmSender } from './fcm-client';

export class CallNotifications {
    constructor(private readonly sender: FcmSender) {}

    sendIncomingCallPush(input: {
        recipientId: number;
        callId: string;
        callerId: number;
        callerName: string;
        callerAvatar?: string | null;
        conversationId?: number;
        expiresAt: Date;
        timestamp: number;
    }): Promise<void> {
        const data: Record<string, string> = {
            type: 'incoming_call',
            call_id: input.callId,
            caller_id: String(input.callerId),
            caller_name: input.callerName,
            call_type: 'video',
            timestamp: String(input.timestamp),
            expires_at: input.expiresAt.toISOString(),
        };

        if (input.callerAvatar) {
            data.caller_avatar = input.callerAvatar;
        }

        if (input.conversationId !== undefined) {
            data.conversation_id = String(input.conversationId);
        }

        return this.sender.sendToUser(input.recipientId, {
            data,
            expiresAt: input.expiresAt,
            collapseKey: `call:${input.callId}`,
        });
    }

    sendCallCancelledPush(
        recipientId: number,
        callId: string,
        reason = 'cancelled',
    ): Promise<void> {
        return this.sender.sendToUser(recipientId, {
            data: {
                type: 'incoming_call_ended',
                call_id: callId,
                reason,
            },
            expiresAt: new Date(Date.now() + 30_000),
            collapseKey: `call:${callId}`,
        });
    }

    sendCallEndedPush(recipientId: number, callId: string, reason = 'ended'): Promise<void> {
        return this.sender.sendToUser(recipientId, {
            data: {
                type: 'incoming_call_ended',
                call_id: callId,
                reason,
            },
            expiresAt: new Date(Date.now() + 30_000),
            collapseKey: `call:${callId}`,
        });
    }
}
