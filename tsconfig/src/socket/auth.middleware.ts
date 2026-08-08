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

            const user = await authenticateAccessToken(token.trim());

            socket.data.user = user;

            next();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Неуспешна автентикация.';

            console.error('Socket authentication error:', message);

            next(new Error(message));
        }
    });
}
