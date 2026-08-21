import { config } from '../../config';

export interface MissedVideoCallInput {
    callId: string;
    callerId: number;
    recipientId: number;
    callerName: string;
    callerAvatar?: string | null;
    conversationId?: number;
}

export type CallEventOutcome = 'completed' | 'missed' | 'rejected' | 'cancelled' | 'unanswered';

export interface CallEventInput {
    callId: string;
    callerId: number;
    recipientId: number;
    callType: 'audio' | 'video';
    outcome: CallEventOutcome;
    startedAt: string;
    endedAt: string;
    answeredAt?: string | null;
    durationSeconds: number;
    endedById?: number | null;
    reason?: string | null;
    cameraEnabled?: boolean;
    conversationId?: number;
}

export interface MissedCallRecorder {
    recordMissedVideoCall(input: MissedVideoCallInput): Promise<void>;
    recordCallEvent(input: CallEventInput): Promise<void>;
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

        await this.post('/internal/mobile/notifications/missed-video-call', body);
    }

    async recordCallEvent(input: CallEventInput): Promise<void> {
        const body: Record<string, unknown> = {
            call_id: input.callId,
            caller_id: input.callerId,
            recipient_id: input.recipientId,
            call_type: input.callType,
            outcome: input.outcome,
            started_at: input.startedAt,
            ended_at: input.endedAt,
            duration_seconds: input.durationSeconds,
            camera_enabled: input.cameraEnabled === true,
        };

        if (input.answeredAt) {
            body.answered_at = input.answeredAt;
        }

        if (input.endedById) {
            body.ended_by_id = input.endedById;
        }

        if (input.reason) {
            body.reason = input.reason;
        }

        if (input.conversationId !== undefined) {
            body.conversation_id = input.conversationId;
        }

        await this.post('/internal/mobile/calls/log', body);
    }

    private async post(path: string, body: Record<string, unknown>): Promise<void> {
        const response = await fetch(`${config.phpApiUrl}${path}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Internal-Secret': config.internalApiSecret,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
            throw new Error(`PHP ${path} failed with HTTP ${response.status}.`);
        }
    }
}
