export const CALL_NO_ANSWER_MS = 30_000;
export const CALL_SESSION_RETENTION_MS = 60_000;

export type CallType = 'video';

export type CallStatus =
    'ringing' | 'accepted' | 'declined' | 'cancelled' | 'ended' | 'timeout' | 'busy' | 'failed';

export type CallEndReason =
    | 'rejected'
    | 'timeout'
    | 'busy'
    | 'cancelled'
    | 'hangup'
    | 'failed'
    | 'connection_timeout'
    | 'answered_elsewhere'
    | 'rejected_elsewhere';

export type CallDescription = {
    type: 'offer' | 'answer';
    sdp: string;
};

export type CallIceCandidate = {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
};

export type CallClientPayload = {
    call_id: string;
    recipient_id: number;
    description?: CallDescription;
    candidate?: CallIceCandidate;
    reason?: CallEndReason;
};

export type CallServerPayload = {
    call_id: string;
    sender_id: number;
    description?: CallDescription;
    candidate?: CallIceCandidate;
    reason?: CallEndReason;
    caller_name?: string;
    caller_avatar?: string | null;
    call_type?: CallType;
    timestamp?: number;
};

export type CallIceCandidateRecord = {
    sender_id: number;
    candidate: CallIceCandidate;
};

export type CallSession = {
    call_id: string;
    caller_id: number;
    recipient_id: number;
    status: CallStatus;
    offer?: CallDescription;
    ice_candidates: CallIceCandidateRecord[];
    caller_name: string;
    caller_avatar: string | null;
    call_type: CallType;
    created_at: number;
    timeout_timer?: ReturnType<typeof setTimeout>;
    retention_timer?: ReturnType<typeof setTimeout>;
};

export type DeviceRegisterPayload = {
    expo_push_token?: string;
    app_state?: 'active' | 'background';
};

export type AppStatePayload = {
    app_state: 'active' | 'background';
};

export type CallStatePayload = {
    call: CallServerPayload | null;
    pending_ice_candidates: CallIceCandidate[];
    status: CallStatus | 'idle';
};

export const ACTIVE_CALL_STATUSES: CallStatus[] = ['ringing', 'accepted'];

export const TERMINAL_CALL_STATUSES: CallStatus[] = [
    'declined',
    'cancelled',
    'ended',
    'timeout',
    'busy',
    'failed',
];

export function isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

export function statusForEndReason(reason?: CallEndReason): CallStatus {
    if (reason === 'rejected') {
        return 'declined';
    }

    if (
        reason === 'timeout' ||
        reason === 'busy' ||
        reason === 'cancelled' ||
        reason === 'failed'
    ) {
        return reason;
    }

    return 'ended';
}
