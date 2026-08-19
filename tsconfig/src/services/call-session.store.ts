import {
    ACTIVE_CALL_STATUSES,
    CALL_SESSION_RETENTION_MS,
    TERMINAL_CALL_STATUSES,
    type CallDescription,
    type CallIceCandidate,
    type CallIceCandidateRecord,
    type CallSession,
    type CallStatus,
    type CallType,
} from '../types/call';

export class CallSessionStore {
    private readonly sessions = new Map<string, CallSession>();
    private readonly activeCallByUser = new Map<number, string>();

    get(callId: string): CallSession | undefined {
        return this.sessions.get(callId);
    }

    getActiveForUser(userId: number): CallSession | undefined {
        const callId = this.activeCallByUser.get(userId);

        if (!callId) {
            return undefined;
        }

        const session = this.sessions.get(callId);

        if (!session || !ACTIVE_CALL_STATUSES.includes(session.status)) {
            this.activeCallByUser.delete(userId);
            return undefined;
        }

        return session;
    }

    create(input: {
        call_id: string;
        caller_id: number;
        recipient_id: number;
        offer: CallDescription;
        caller_name: string;
        caller_avatar: string | null;
        call_type?: CallType;
        created_at?: number;
    }): CallSession | null {
        const existing = this.sessions.get(input.call_id);

        if (existing) {
            return existing;
        }

        if (this.getActiveForUser(input.caller_id) || this.getActiveForUser(input.recipient_id)) {
            return null;
        }

        const session: CallSession = {
            call_id: input.call_id,
            caller_id: input.caller_id,
            recipient_id: input.recipient_id,
            status: 'ringing',
            offer: input.offer,
            ice_candidates: [],
            caller_name: input.caller_name,
            caller_avatar: input.caller_avatar,
            call_type: input.call_type ?? 'video',
            created_at: input.created_at ?? Date.now(),
        };

        this.sessions.set(session.call_id, session);
        this.activeCallByUser.set(session.caller_id, session.call_id);
        this.activeCallByUser.set(session.recipient_id, session.call_id);

        return session;
    }

    addIceCandidate(
        callId: string,
        senderId: number,
        candidate: CallIceCandidate,
    ): CallIceCandidateRecord | null {
        const session = this.sessions.get(callId);

        if (!session || TERMINAL_CALL_STATUSES.includes(session.status)) {
            return null;
        }

        const record = {
            sender_id: senderId,
            candidate,
        };

        session.ice_candidates.push(record);

        return record;
    }

    updateStatus(callId: string, status: CallStatus): CallSession | undefined {
        const session = this.sessions.get(callId);

        if (!session) {
            return undefined;
        }

        if (TERMINAL_CALL_STATUSES.includes(session.status) && session.status !== status) {
            return session;
        }

        session.status = status;

        if (TERMINAL_CALL_STATUSES.includes(status)) {
            this.clearTimeout(session);
            this.releaseUsers(session);
            this.scheduleRetention(session);
        }

        return session;
    }

    setTimeoutTimer(callId: string, timer: ReturnType<typeof setTimeout>): void {
        const session = this.sessions.get(callId);

        if (!session) {
            return;
        }

        this.clearTimeout(session);
        session.timeout_timer = timer;
    }

    clearTimeout(session: CallSession): void {
        if (session.timeout_timer) {
            clearTimeout(session.timeout_timer);
            session.timeout_timer = undefined;
        }
    }

    delete(callId: string): void {
        const session = this.sessions.get(callId);

        if (!session) {
            return;
        }

        this.clearTimeout(session);

        if (session.retention_timer) {
            clearTimeout(session.retention_timer);
        }

        this.releaseUsers(session);
        this.sessions.delete(callId);
    }

    private releaseUsers(session: CallSession): void {
        if (this.activeCallByUser.get(session.caller_id) === session.call_id) {
            this.activeCallByUser.delete(session.caller_id);
        }

        if (this.activeCallByUser.get(session.recipient_id) === session.call_id) {
            this.activeCallByUser.delete(session.recipient_id);
        }
    }

    private scheduleRetention(session: CallSession): void {
        if (session.retention_timer) {
            clearTimeout(session.retention_timer);
        }

        session.retention_timer = setTimeout(() => {
            this.sessions.delete(session.call_id);
        }, CALL_SESSION_RETENTION_MS);
    }
}

export const callSessionStore = new CallSessionStore();
