import type { IceCandidatePayload, SessionDescriptionPayload } from '../../types/events';

export type CallStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'ended';

export interface PendingCall {
    callId: string;
    callerId: number;
    callerName: string;
    callerAvatar?: string | null;
    recipientId: number;
    status: CallStatus;
    createdAt: Date;
    expiresAt: Date;
    offer?: SessionDescriptionPayload;
    callType: 'audio' | 'video';
    cameraEnabled: boolean;
    conversationId?: number;
    acceptedAt?: Date;
    callerSocketId?: string;
    recipientSocketId?: string;
    batteryWarningEmitted?: boolean;
    lowBatteryUserIds?: number[];
    bufferedIce: IceCandidatePayload[];
    answered?: boolean;
}

export interface CallStore {
    create(call: PendingCall): boolean;
    get(callId: string): PendingCall | undefined;
    findActiveForUser(userId: number, now: Date): PendingCall | undefined;
    findPendingForRecipient(recipientId: number, now: Date): PendingCall[];
    findIncomingForRecipient(recipientId: number, now: Date): PendingCall[];
    transition(callId: string, from: CallStatus, to: CallStatus): PendingCall | undefined;
    claim(callId: string, from: CallStatus, to: CallStatus): PendingCall | undefined;
    addIce(callId: string, candidate: IceCandidatePayload): boolean;
    getExpiredPending(now: Date): PendingCall[];
}

export class InMemoryCallStore implements CallStore {
    private readonly calls = new Map<string, PendingCall>();

    create(call: PendingCall): boolean {
        if (this.calls.has(call.callId)) return false;
        this.calls.set(call.callId, call);
        return true;
    }

    get(callId: string): PendingCall | undefined {
        return this.calls.get(callId);
    }

    findActiveForUser(userId: number, now: Date): PendingCall | undefined {
        return [...this.calls.values()].find((call) => {
            if (call.callerId !== userId && call.recipientId !== userId) {
                return false;
            }

            return (
                call.status === 'accepted' || (call.status === 'pending' && call.expiresAt > now)
            );
        });
    }

    findPendingForRecipient(recipientId: number, now: Date): PendingCall[] {
        return [...this.calls.values()].filter(
            (call) =>
                call.recipientId === recipientId &&
                call.status === 'pending' &&
                call.expiresAt > now,
        );
    }

    findIncomingForRecipient(recipientId: number, now: Date): PendingCall[] {
        return [...this.calls.values()].filter((call) => {
            if (call.recipientId !== recipientId || !call.offer) {
                return false;
            }

            if (call.status === 'pending') {
                return call.expiresAt > now;
            }

            return call.status === 'accepted';
        });
    }

    transition(callId: string, from: CallStatus, to: CallStatus): PendingCall | undefined {
        const call = this.calls.get(callId);
        if (!call || call.status !== from) return undefined;
        call.status = to;
        call.offer = undefined;
        call.bufferedIce = [];
        return call;
    }

    claim(callId: string, from: CallStatus, to: CallStatus): PendingCall | undefined {
        const call = this.calls.get(callId);
        if (!call || call.status !== from) return undefined;
        call.status = to;
        return call;
    }

    addIce(callId: string, candidate: IceCandidatePayload): boolean {
        const call = this.calls.get(callId);
        if (!call || (call.status !== 'pending' && call.status !== 'accepted')) return false;
        call.bufferedIce.push(candidate);
        return true;
    }

    getExpiredPending(now: Date): PendingCall[] {
        return [...this.calls.values()].filter(
            (call) => call.status === 'pending' && call.expiresAt <= now,
        );
    }
}
