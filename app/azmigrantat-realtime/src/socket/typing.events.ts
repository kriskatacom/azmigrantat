import type { Socket } from 'socket.io';

import type { TypingAuthorizationProvider } from '../services/conversations/typing-authorization.provider';
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

export function registerTypingEvents(
    socket: RealtimeSocket,
    authorizer?: TypingAuthorizationProvider,
): void {
    const relay = async (payload: TypingClientPayload, isTyping: boolean): Promise<void> => {
        if (
            !authorizer ||
            !Number.isInteger(payload.conversation_id) ||
            payload.conversation_id <= 0
        ) {
            return;
        }

        let recipientIds: number[] = [];

        try {
            recipientIds = await authorizer.allowedRecipientIds(
                payload.conversation_id,
                socket.data.user.id,
                getRecipientIds(payload),
            );
        } catch (error) {
            console.error('Typing authorization failed:', error);
            return;
        }

        for (const recipientId of recipientIds) {
            socket.to(`user:${recipientId}`).emit('typing:update', {
                conversation_id: payload.conversation_id,
                user_id: socket.data.user.id,
                is_typing: isTyping,
            });
        }
    };

    socket.on('typing:start', (payload) => {
        void relay(payload, true);
    });

    socket.on('typing:stop', (payload) => {
        void relay(payload, false);
    });
}
