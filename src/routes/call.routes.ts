import type { Express, NextFunction, Request, Response } from 'express';

import { authenticateAccessToken } from '../services/auth.service';
import type { CallService } from '../services/calls/call-service';

async function authenticateRequest(
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> {
    const header = request.header('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token) {
        response.status(401).json({
            success: false,
            message: 'Липсва access token.',
        });
        return;
    }

    try {
        response.locals.user = await authenticateAccessToken(token);
        next();
    } catch (error) {
        response.status(401).json({
            success: false,
            message: error instanceof Error ? error.message : 'Неуспешна автентикация.',
        });
    }
}

export function registerCallRoutes(app: Express, calls: CallService): void {
    app.get('/calls/ringing', authenticateRequest, (request, response) => {
        const userId = Number(response.locals.user?.id);
        const ringing = calls.getRingingForRecipient(userId);

        console.log('[CALL] ringing lookup', {
            userId,
            callId: ringing.call?.call_id ?? null,
        });

        response.json({
            success: true,
            call: ringing.call,
            pending_ice_candidates: ringing.pending_ice_candidates,
            status: ringing.status,
        });
    });

    app.post('/calls/decline', authenticateRequest, async (request, response) => {
        const userId = Number(response.locals.user?.id);
        const callId = typeof request.body?.call_id === 'string' ? request.body.call_id.trim() : '';

        if (!callId) {
            response.status(422).json({
                success: false,
                message: 'Липсва call_id.',
            });
            return;
        }

        const result = await calls.declineByUser(userId, callId);

        if (!result.ok) {
            response.status(result.status).json({
                success: false,
                message: result.message,
            });
            return;
        }

        response.json({
            success: true,
            status: result.status,
        });
    });

    app.post('/calls/accept', authenticateRequest, async (request, response) => {
        const userId = Number(response.locals.user?.id);
        const callId = typeof request.body?.call_id === 'string' ? request.body.call_id.trim() : '';

        if (!callId) {
            response.status(422).json({
                success: false,
                message: 'Липсва call_id.',
            });
            return;
        }

        const result = await calls.acceptByUser(userId, callId);

        if (!result.ok) {
            response.status(result.status).json({
                success: false,
                message: result.message,
            });
            return;
        }

        response.json({
            success: true,
            status: result.status,
        });
    });

    app.get('/calls/:callId', authenticateRequest, (request, response) => {
        const userId = Number(response.locals.user?.id);
        const callId = String(request.params.callId ?? '').trim();

        if (!callId) {
            response.status(422).json({
                success: false,
                message: 'Липсва call_id.',
            });
            return;
        }

        const result = calls.getCallForUser(userId, callId);
        console.log('[CALL] lookup', {
            userId,
            callId,
            status: result.status,
        });

        response.json({
            success: true,
            call: result.call,
            pending_ice_candidates: result.pending_ice_candidates,
            status: result.status,
        });
    });

    app.post('/calls/:callId/accept', authenticateRequest, async (request, response) => {
        const userId = Number(response.locals.user?.id);
        const callId = String(request.params.callId ?? '').trim();

        if (!callId) {
            response.status(422).json({
                success: false,
                message: 'Липсва call_id.',
            });
            return;
        }

        const result = await calls.acceptByUser(userId, callId);

        if (!result.ok) {
            response.status(result.status).json({
                success: false,
                message: result.message,
            });
            return;
        }

        response.json({
            success: true,
            status: result.status,
        });
    });

    app.post('/calls/:callId/decline', authenticateRequest, async (request, response) => {
        const userId = Number(response.locals.user?.id);
        const callId = String(request.params.callId ?? '').trim();

        if (!callId) {
            response.status(422).json({
                success: false,
                message: 'Липсва call_id.',
            });
            return;
        }

        const result = await calls.declineByUser(userId, callId);

        if (!result.ok) {
            response.status(result.status).json({
                success: false,
                message: result.message,
            });
            return;
        }

        response.json({
            success: true,
            status: result.status,
        });
    });
}
