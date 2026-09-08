import type { Express } from 'express';

export function registerHealthRoutes(app: Express): void {
    app.get('/health', (_request, response) => {
        response.json({
            success: true,
            service: 'azmigrantat-realtime',
            timestamp: new Date().toISOString(),
        });
    });
}
