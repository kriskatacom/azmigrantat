import type { Socket } from 'socket.io';

import type {
    ClientToServerEvents,
    InterServerEvents,
    ServerToClientEvents,
    SocketData,
    TypingClientPayload,
} from '../types/events';

type RealtimeSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

function getRecipientIds(payload: TypingClientPayload): number[] {
    return [
        ...new Set(
            payload.recipient_ids.filter((id): id is number => Number.isInteger(id) && id > 0),
        ),
    ];
}

export function registerTypingEvents(socket: RealtimeSocket): void {
    socket.on('typing:start', (payload) => {
        console.log('typing:start', payload);
        const recipientIds = getRecipientIds(payload);

        for (const recipientId of recipientIds) {
            socket.to(`user:${recipientId}`).emit('typing:update', {
                conversation_id: payload.conversation_id,
                user_id: socket.data.user.id,
                is_typing: true,
            });
        }
    });

    socket.on('typing:stop', (payload) => {
        console.log('typing:stop', payload);
        const recipientIds = getRecipientIds(payload);

        for (const recipientId of recipientIds) {
            socket.to(`user:${recipientId}`).emit('typing:update', {
                conversation_id: payload.conversation_id,
                user_id: socket.data.user.id,
                is_typing: false,
            });
        }
    });
}
