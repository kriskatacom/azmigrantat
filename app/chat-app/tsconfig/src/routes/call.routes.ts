import type { Express, NextFunction, Request, Response } from 'express';

import { authenticateAccessToken } from '../services/auth.service';
import { callSessionStore } from '../services/call-session.store';
import type { RealtimeServer } from '../types/events';
import { isNonEmptyString } from '../types/call';
import { finishCall } from '../socket/call.events';

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

export function registerCallRoutes(app: Express, io: RealtimeServer): void {
    app.get('/calls/ringing', authenticateRequest, (_request, response) => {
        const userId = Number(response.locals.user?.id);
        const session = callSessionStore.getActiveForUser(userId);

        if (!session || session.recipient_id !== userId || session.status !== 'ringing') {
            response.json({
                success: true,
                call: null,
                pending_ice_candidates: [],
            });
            return;
        }

        response.json({
            success: true,
            call: {
                call_id: session.call_id,
                sender_id: session.caller_id,
                description: session.offer,
                caller_name: session.caller_name,
                caller_avatar: session.caller_avatar,
                call_type: session.call_type,
                timestamp: session.created_at,
            },
            pending_ice_candidates: session.ice_candidates
                .filter((record) => record.sender_id === session.caller_id)
                .map((record) => record.candidate),
        });
    });

    app.post('/calls/decline', authenticateRequest, async (request, response) => {
        const userId = Number(response.locals.user?.id);
        const callId = isNonEmptyString(request.body?.call_id) ? request.body.call_id.trim() : '';

        if (!callId) {
            response.status(422).json({
                success: false,
                message: 'Липсва call_id.',
            });
            return;
        }

        const session = callSessionStore.get(callId);

        if (!session) {
            response.json({
                success: true,
                status: 'ended',
            });
            return;
        }

        if (session.recipient_id !== userId && session.caller_id !== userId) {
            response.status(403).json({
                success: false,
                message: 'Нямате достъп до това обаждане.',
            });
            return;
        }

        if (session.status === 'ringing') {
            await finishCall(io, session, 'rejected', userId);
        }

        response.json({
            success: true,
            status: 'declined',
        });
    });
}
