import { createHash } from 'node:crypto';

import { authenticateAccessToken } from '../services/auth.service';
import type { RealtimeServer } from '../types/events';

export function registerSocketAuthMiddleware(io: RealtimeServer): void {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;

            if (typeof token !== 'string' || !token.trim()) {
                next(new Error('Липсва access token.'));
                return;
            }

            const accessToken = token.trim();
            const user = await authenticateAccessToken(accessToken);

            socket.data.user = user;
            socket.data.tokenHash = createHash('sha256').update(accessToken).digest('hex');

            next();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Неуспешна автентикация.';

            console.error('Socket authentication error:', message);

            next(new Error(message));
        }
    });
}
