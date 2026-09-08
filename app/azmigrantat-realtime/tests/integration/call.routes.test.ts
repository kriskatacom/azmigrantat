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

import { authenticateAccessToken } from '../../src/services/auth.service';
import { registerCallRoutes } from '../../src/routes/call.routes';
import type { CallService } from '../../src/services/calls/call-service';

const authenticateMock = vi.mocked(authenticateAccessToken);

function createTestApp(calls: Partial<CallService>) {
    const app = express();
    app.use(express.json());
    registerCallRoutes(app, calls as CallService);
    return app;
}

describe('call routes', () => {
    beforeEach(() => {
        authenticateMock.mockReset();
        authenticateMock.mockResolvedValue({
            id: 44,
            name: 'Receiver',
            role: 'user',
            is_active: true,
        });
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('връща 401 без access token', async () => {
        const app = createTestApp({
            getRingingForRecipient: vi.fn(),
        });

        const response = await request(app).get('/calls/ringing');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('връща текущото входящо обаждане', async () => {
        const call = {
            call_id: 'call-1',
            sender_id: 22,
            description: { type: 'offer' as const, sdp: 'offer-sdp' },
            caller_name: 'Caller',
            caller_avatar: null,
            call_type: 'video' as const,
            timestamp: 1,
        };
        const app = createTestApp({
            getRingingForRecipient: vi.fn().mockReturnValue({
                call,
                pending_ice_candidates: [
                    { candidate: 'candidate:1', sdpMid: '0', sdpMLineIndex: 0 },
                ],
                status: 'ringing',
            }),
        });

        const response = await request(app)
            .get('/calls/ringing')
            .set('Authorization', 'Bearer token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            call,
            pending_ice_candidates: [{ candidate: 'candidate:1', sdpMid: '0', sdpMLineIndex: 0 }],
            status: 'ringing',
        });
    });

    it('отказва обаждане през HTTP', async () => {
        const declineByUser = vi.fn().mockResolvedValue({ ok: true, status: 'declined' });
        const app = createTestApp({ declineByUser });

        const response = await request(app)
            .post('/calls/decline')
            .set('Authorization', 'Bearer token')
            .send({ call_id: 'call-1' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, status: 'declined' });
        expect(declineByUser).toHaveBeenCalledWith(44, 'call-1');
    });

    it('приема обаждане през HTTP', async () => {
        const acceptByUser = vi.fn().mockResolvedValue({ ok: true, status: 'accepted' });
        const app = createTestApp({ acceptByUser });

        const response = await request(app)
            .post('/calls/accept')
            .set('Authorization', 'Bearer token')
            .send({ call_id: 'call-1' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, status: 'accepted' });
        expect(acceptByUser).toHaveBeenCalledWith(44, 'call-1');
    });

    it('приема обаждане през native-friendly path', async () => {
        const acceptByUser = vi.fn().mockResolvedValue({ ok: true, status: 'accepted' });
        const app = createTestApp({ acceptByUser });

        const response = await request(app)
            .post('/calls/call-1/accept')
            .set('Authorization', 'Bearer token')
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, status: 'accepted' });
        expect(acceptByUser).toHaveBeenCalledWith(44, 'call-1');
    });

    it('връща обаждане по callId', async () => {
        const call = {
            call_id: 'call-1',
            sender_id: 22,
            description: { type: 'offer' as const, sdp: 'offer-sdp' },
            caller_name: 'Caller',
            caller_avatar: null,
            call_type: 'video' as const,
            timestamp: 1,
        };
        const app = createTestApp({
            getCallForUser: vi.fn().mockReturnValue({
                call,
                pending_ice_candidates: [],
                status: 'accepted',
            }),
        });

        const response = await request(app)
            .get('/calls/call-1')
            .set('Authorization', 'Bearer token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            call,
            pending_ice_candidates: [],
            status: 'accepted',
        });
    });
});
