import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CallService } from '../../src/services/calls/call-service';
import { registerCallEvents } from '../../src/socket/call.events';

type Handler = (payload: unknown) => unknown;

function createHarness() {
    const handlers = new Map<string, Handler>();
    const calls = {
        offer: vi.fn(),
        answer: vi.fn(),
        acceptIntent: vi.fn(),
        ice: vi.fn(),
        end: vi.fn(),
        replay: vi.fn(),
    } as unknown as CallService;
    const socket = {
        data: { user: { id: 17 } },
        handshake: { auth: {} },
        on: vi.fn((event: string, handler: Handler) => handlers.set(event, handler)),
    } as unknown as Parameters<typeof registerCallEvents>[0];

    registerCallEvents(socket, calls);
    return { handlers, calls, socket };
}

describe('registerCallEvents', () => {
    let harness: ReturnType<typeof createHarness>;

    beforeEach(() => {
        harness = createHarness();
    });

    it('регистрира четирите съществуващи signaling събития', () => {
        expect([...harness.handlers.keys()]).toEqual([
            'call:offer',
            'call:answer',
            'call:accept',
            'call:ice-candidate',
            'call:end',
            'call:sync',
            'device:register',
            'app:state',
        ]);
    });

    it('предава валиден offer към call service без да променя contract-а', async () => {
        const payload = {
            call_id: ' call-1 ',
            recipient_id: 23,
            description: { type: 'offer', sdp: 'offer-sdp' },
        };
        await harness.handlers.get('call:offer')?.(payload);
        expect(harness.calls.offer).toHaveBeenCalledWith(harness.socket, {
            ...payload,
            call_id: 'call-1',
        });
    });

    it('предава call:accept към call service', async () => {
        await harness.handlers.get('call:accept')?.({
            call_id: ' call-1 ',
            recipient_id: 23,
        });
        expect(harness.calls.acceptIntent).toHaveBeenCalledWith(harness.socket, {
            call_id: 'call-1',
            recipient_id: 23,
        });
    });

    it.each([
        ['call:offer', { call_id: '', recipient_id: 23 }],
        ['call:answer', { call_id: 'call-1', recipient_id: 0 }],
        [
            'call:ice-candidate',
            {
                call_id: 'call-1',
                recipient_id: 23,
                candidate: { candidate: '', sdpMid: null, sdpMLineIndex: null },
            },
        ],
    ])('отхвърля невалиден %s payload', async (event, payload) => {
        await harness.handlers.get(event)?.(payload);
        expect(harness.calls.offer).not.toHaveBeenCalled();
        expect(harness.calls.answer).not.toHaveBeenCalled();
        expect(harness.calls.ice).not.toHaveBeenCalled();
        expect(harness.calls.end).not.toHaveBeenCalled();
    });
});
