import type { Express } from 'express';

import { config } from '../config';
import type { NewMessageEventPayload, RealtimeServer } from '../types/events';

export function registerInternalRoutes(app: Express, io: RealtimeServer): void {
    app.post('/internal/events/message', async (request, response) => {
        const providedSecret = request.header('X-Internal-Secret');

        if (!providedSecret || providedSecret !== config.internalApiSecret) {
            response.status(401).json({
                success: false,
                message: 'Невалиден вътрешен ключ.',
            });

            return;
        }

        const payload = request.body as Partial<NewMessageEventPayload>;

        if (!Array.isArray(payload.recipient_ids) || payload.recipient_ids.length === 0) {
            response.status(422).json({
                success: false,
                message: 'Липсват получатели.',
            });

            return;
        }

        if (
            !payload.message ||
            typeof payload.message !== 'object' ||
            typeof payload.message.id !== 'number' ||
            typeof payload.message.conversation_id !== 'number' ||
            typeof payload.message.sender_id !== 'number'
        ) {
            response.status(422).json({
                success: false,
                message: 'Подадено е невалидно съобщение.',
            });

            return;
        }

        const validRecipientIds = payload.recipient_ids.filter(
            (recipientId): recipientId is number =>
                Number.isInteger(recipientId) && recipientId > 0,
        );

        if (validRecipientIds.length === 0) {
            response.status(422).json({
                success: false,
                message: 'Няма валидни получатели.',
            });

            return;
        }

        const recipientIds = [
            ...new Set([...validRecipientIds, payload.message.sender_id]),
        ];

        if (recipientIds.length === 0) {
            response.status(422).json({
                success: false,
                message: 'Няма валидни получатели.',
            });

            return;
        }

        let connectedRecipients = 0;
        let deliveredSockets = 0;

        for (const recipientId of recipientIds) {
            const room = `user:${recipientId}`;
            const sockets = await io.in(room).fetchSockets();

            if (sockets.length > 0) {
                connectedRecipients += 1;
                deliveredSockets += sockets.length;
            }

            io.to(room).emit('message:new', payload.message);
        }

        console.log(`message:new ${payload.message.id} → ${recipientIds.join(', ')}`);

        response.json({
            success: true,
            recipient_count: recipientIds.length,
            connected_recipient_count: connectedRecipients,
            delivered_socket_count: deliveredSockets,
        });
    });

    app.post('/internal/events/message-read', async (request, response) => {
        const providedSecret = request.header('X-Internal-Secret');

        if (!providedSecret || providedSecret !== config.internalApiSecret) {
            response.status(401).json({
                success: false,
                message: 'Невалиден вътрешен ключ.',
            });

            return;
        }

        const { recipient_ids, conversation_id, reader_id, last_read_message_id, read_at } =
            request.body as {
                recipient_ids?: unknown;
                conversation_id?: unknown;
                reader_id?: unknown;
                last_read_message_id?: unknown;
                read_at?: unknown;
            };

        if (
            !Array.isArray(recipient_ids) ||
            typeof conversation_id !== 'number' ||
            typeof reader_id !== 'number' ||
            typeof last_read_message_id !== 'number' ||
            typeof read_at !== 'string'
        ) {
            response.status(422).json({
                success: false,
                message: 'Невалидни данни за прочетено съобщение.',
            });

            return;
        }
        const recipientIds = [
            ...new Set(recipient_ids.filter((id): id is number => Number.isInteger(id) && id > 0)),
        ];

        if (recipientIds.length === 0) {
            response.status(422).json({
                success: false,
                message: 'Няма валидни получатели.',
            });

            return;
        }

        const payload = {
            conversation_id,
            reader_id,
            last_read_message_id,
            read_at,
        };

        let connectedRecipients = 0;
        let deliveredSockets = 0;

        for (const recipientId of recipientIds) {
            const room = `user:${recipientId}`;
            const sockets = await io.in(room).fetchSockets();

            if (sockets.length > 0) {
                connectedRecipients += 1;
                deliveredSockets += sockets.length;
            }

            io.to(room).emit('message:read', payload);
        }

        console.log(`message:read conversation ${conversation_id} → ${recipientIds.join(', ')}`);

        response.json({
            success: true,
            recipient_count: recipientIds.length,
            connected_recipient_count: connectedRecipients,
            delivered_socket_count: deliveredSockets,
        });
    });
}
