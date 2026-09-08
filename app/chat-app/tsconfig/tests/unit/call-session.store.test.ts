import { afterEach, describe, expect, it } from 'vitest';

import { CallSessionStore } from '../../src/services/call-session.store';

const offer = {
    type: 'offer' as const,
    sdp: 'v=0',
};

function createStoreSession(
    store: CallSessionStore,
    callId = 'call-1',
    callerId = 1,
    recipientId = 2,
) {
    return store.create({
        call_id: callId,
        caller_id: callerId,
        recipient_id: recipientId,
        offer,
        caller_name: 'Иван',
        caller_avatar: null,
    });
}

describe('CallSessionStore', () => {
    const stores: CallSessionStore[] = [];

    afterEach(() => {
        for (const store of stores) {
            store.get('call-1');
        }
    });

    it('създава нов ringing session и го връща по потребител', () => {
        const store = new CallSessionStore();
        const session = createStoreSession(store);

        expect(session).not.toBeNull();
        expect(session?.status).toBe('ringing');
        expect(store.get('call-1')?.call_id).toBe('call-1');
        expect(store.getActiveForUser(1)?.call_id).toBe('call-1');
        expect(store.getActiveForUser(2)?.call_id).toBe('call-1');
    });

    it('връща същия session при повторен create с този call_id', () => {
        const store = new CallSessionStore();
        const first = createStoreSession(store);
        const second = createStoreSession(store);

        expect(second).toBe(first);
    });

    it('отхвърля второ обаждане, докато потребителят е зает', () => {
        const store = new CallSessionStore();
        createStoreSession(store);

        const busy = store.create({
            call_id: 'call-2',
            caller_id: 3,
            recipient_id: 2,
            offer,
            caller_name: 'Мария',
            caller_avatar: null,
        });

        expect(busy).toBeNull();
    });

    it('буферира ICE кандидати само за активен разговор', () => {
        const store = new CallSessionStore();
        createStoreSession(store);

        const record = store.addIceCandidate('call-1', 1, {
            candidate: 'candidate:1',
            sdpMid: '0',
            sdpMLineIndex: 0,
        });

        expect(record?.candidate.candidate).toBe('candidate:1');
        expect(store.get('call-1')?.ice_candidates).toHaveLength(1);

        store.updateStatus('call-1', 'declined');

        expect(
            store.addIceCandidate('call-1', 1, {
                candidate: 'candidate:2',
            }),
        ).toBeNull();
        expect(store.getActiveForUser(1)).toBeUndefined();
        expect(store.getActiveForUser(2)).toBeUndefined();
    });

    it('не презаписва терминален статус', () => {
        const store = new CallSessionStore();
        createStoreSession(store);
        store.updateStatus('call-1', 'timeout');
        store.updateStatus('call-1', 'accepted');

        expect(store.get('call-1')?.status).toBe('timeout');
    });
});
