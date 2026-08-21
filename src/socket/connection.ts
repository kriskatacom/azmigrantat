import type { CallService } from '../services/calls/call-service';
import type { TypingAuthorizationProvider } from '../services/conversations/typing-authorization.provider';
import type { RealtimeServer } from '../types/events';
import type { SocketConnectionReadyPayload } from '../types/socket';
import { registerCallEvents } from './call.events';
import { registerTypingEvents } from './typing.events';

const lastSeenByUser = new Map<number, string>();

export function registerSocketConnections(
    io: RealtimeServer,
    calls: CallService,
    typingAuthorization?: TypingAuthorizationProvider,
): void {
    io.on('connection', async (socket) => {
        const user = socket.data.user;
        const userRoom = `user:${user.id}`;

        await socket.join(userRoom);

        registerTypingEvents(socket, typingAuthorization);
        registerCallEvents(socket, calls);

        const socketsInRoom = await io.in(userRoom).fetchSockets();

        if (socketsInRoom.length === 1) {
            io.emit('presence:update', {
                user_id: user.id,
                is_online: true,
                last_seen_at: null,
            });
        }

        const readyPayload: SocketConnectionReadyPayload = {
            user,
            socketId: socket.id,
        };

        socket.emit('connection:ready', readyPayload);
        calls.replay(socket);

        socket.on('presence:check', async (payload) => {
            const userId = Number(payload.user_id);

            if (!Number.isInteger(userId) || userId <= 0) {
                return;
            }

            const checkedUserRoom = `user:${userId}`;

            const sockets = await io.in(checkedUserRoom).fetchSockets();

            const isOnline = sockets.length > 0;

            socket.emit('presence:status', {
                user_id: userId,
                is_online: isOnline,
                last_seen_at: isOnline ? null : (lastSeenByUser.get(userId) ?? null),
            });
        });

        socket.on('disconnect', async (reason) => {
            console.log(`Потребител ${user.id} прекъсна връзката. Причина: ${reason}`);

            const remainingSockets = await io.in(userRoom).fetchSockets();

            if (remainingSockets.length === 0) {
                const lastSeenAt = new Date().toISOString();

                lastSeenByUser.set(user.id, lastSeenAt);

                io.emit('presence:update', {
                    user_id: user.id,
                    is_online: false,
                    last_seen_at: lastSeenAt,
                });
            }
        });
    });
}
