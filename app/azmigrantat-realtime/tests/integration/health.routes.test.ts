import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { registerHealthRoutes } from '../../src/routes/health.routes';

function createTestApp() {
    const app = express();

    registerHealthRoutes(app);

    return app;
}

describe('GET /health', () => {
    it('връща успешен отговор за работещ realtime сървър', async () => {
        const app = createTestApp();

        const response = await request(app).get('/health');

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            success: true,
            service: 'azmigrantat-realtime',
            timestamp: expect.any(String),
        });
    });

    it('връща timestamp във валиден ISO формат', async () => {
        const app = createTestApp();

        const response = await request(app).get('/health');

        const timestamp = response.body.timestamp as string;
        const parsedTimestamp = new Date(timestamp);

        expect(Number.isNaN(parsedTimestamp.getTime())).toBe(false);
        expect(parsedTimestamp.toISOString()).toBe(timestamp);
    });

    it('връща JSON съдържание', async () => {
        const app = createTestApp();

        const response = await request(app).get('/health');

        expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('не приема POST заявка към health маршрута', async () => {
        const app = createTestApp();

        const response = await request(app).post('/health');

        expect(response.status).toBe(404);
    });
});
