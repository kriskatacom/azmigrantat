import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config', () => ({
    config: {
        phpApiUrl: 'https://api.example.com',
        internalApiSecret: 'test-internal-secret',
    },
}));

vi.mock('../../src/services/auth.service', () => ({
    authenticateAccessToken: vi.fn(),
}));

vi.mock('../../src/services/expo-push.service', () => ({
    sendIncomingCallPush: vi.fn(),
    sendIncomingCallEndedPush: vi.fn(),
}));

import { authenticateAccessToken } from '../../src/services/auth.service';
import { callSessionStore } from '../../src/services/call-session.store';
import { registerCallRoutes } from '../../src/routes/call.routes';

const authenticateMock = vi.mocked(authenticateAccessToken);

function createIo() {
    const emit = vi.fn();

    return {
        io: {
            to: vi.fn(() => ({ emit })),
            in: vi.fn(() => ({
                fetchSockets: vi.fn(async () => []),
            })),
        } as unknown as Parameters<typeof registerCallRoutes>[1],
        emit,
    };
}

function createTestApp() {
    const app = express();
    const socketServer = createIo();

    app.use(express.json());
    registerCallRoutes(app, socketServer.io);

    return {
        app,
        ...socketServer,
    };
}

describe('call routes', () => {
    beforeEach(() => {
        authenticateMock.mockReset();
        authenticateMock.mockResolvedValue({
            id: 2,
            name: 'Receiver',
            role: 'user',
            is_active: true,
        });
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        callSessionStore.delete('call-route-1');
        vi.restoreAllMocks();
    });

    it('връща 401 без access token', async () => {
        const { app } = createTestApp();

        const response = await request(app).get('/calls/ringing');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('връща текущото входящо обаждане', async () => {
        const { app } = createTestApp();
        const created = callSessionStore.create({
            call_id: 'call-route-1',
            caller_id: 1,
            recipient_id: 2,
            offer: { type: 'offer', sdp: 'v=0' },
            caller_name: 'Иван',
            caller_avatar: 'https://cdn.example/ivan.png',
        });

        expect(created).not.toBeNull();

        const response = await request(app)
            .get('/calls/ringing')
            .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body.call.call_id).toBe('call-route-1');
        expect(response.body.call.caller_name).toBe('Иван');
        expect(response.body.pending_ice_candidates).toEqual([]);
    });

    it('отказва входящо обаждане и уведомява caller-а', async () => {
        const { app, emit } = createTestApp();
        callSessionStore.create({
            call_id: 'call-route-1',
            caller_id: 1,
            recipient_id: 2,
            offer: { type: 'offer', sdp: 'v=0' },
            caller_name: 'Иван',
            caller_avatar: null,
        });

        const response = await request(app)
            .post('/calls/decline')
            .set('Authorization', 'Bearer test-token')
            .send({ call_id: 'call-route-1' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            status: 'declined',
        });
        expect(callSessionStore.get('call-route-1')?.status).toBe('declined');
        expect(emit).toHaveBeenCalled();
    });
});
