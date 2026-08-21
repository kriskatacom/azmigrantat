import type { Express } from 'express';

import { config } from '../config';
import type {
    AppNotificationPayload,
    NewMessageEventPayload,
    RealtimeServer,
} from '../types/events';

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

        const recipientIds = [
            ...new Set(
                payload.recipient_ids.filter(
                    (recipientId): recipientId is number =>
                        Number.isInteger(recipientId) && recipientId > 0,
                ),
            ),
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
        const targetUserIds = [...new Set([...recipientIds, payload.message.sender_id])];

        for (const targetUserId of targetUserIds) {
            const room = `user:${targetUserId}`;
            const sockets = await io.in(room).fetchSockets();

            if (recipientIds.includes(targetUserId)) {
                if (sockets.length > 0) {
                    connectedRecipients += 1;
                    deliveredSockets += sockets.length;
                }
            }

            io.to(room).emit('message:new', payload.message);
        }

        console.log(`message:new ${payload.message.id} → ${targetUserIds.join(', ')}`);

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

    app.post('/internal/events/message-delivered', async (request, response) => {
        const providedSecret = request.header('X-Internal-Secret');

        if (!providedSecret || providedSecret !== config.internalApiSecret) {
            response.status(401).json({
                success: false,
                message: 'Невалиден вътрешен ключ.',
            });

            return;
        }

        const {
            recipient_ids,
            conversation_id,
            recipient_id,
            last_delivered_message_id,
            delivered_at,
        } = request.body as {
            recipient_ids?: unknown;
            conversation_id?: unknown;
            recipient_id?: unknown;
            last_delivered_message_id?: unknown;
            delivered_at?: unknown;
        };

        if (
            !Array.isArray(recipient_ids) ||
            typeof conversation_id !== 'number' ||
            typeof recipient_id !== 'number' ||
            typeof last_delivered_message_id !== 'number' ||
            typeof delivered_at !== 'string'
        ) {
            response.status(422).json({
                success: false,
                message: 'Невалидни данни за получено съобщение.',
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
            recipient_id,
            last_delivered_message_id,
            delivered_at,
        };

        let connectedRecipients = 0;
        let deliveredSockets = 0;

        for (const targetUserId of recipientIds) {
            const room = `user:${targetUserId}`;
            const sockets = await io.in(room).fetchSockets();

            if (sockets.length > 0) {
                connectedRecipients += 1;
                deliveredSockets += sockets.length;
            }

            io.to(room).emit('message:delivered', payload);
        }

        console.log(
            `message:delivered conversation ${conversation_id} → ${recipientIds.join(', ')}`,
        );

        response.json({
            success: true,
            recipient_count: recipientIds.length,
            connected_recipient_count: connectedRecipients,
            delivered_socket_count: deliveredSockets,
        });
    });

    app.post('/internal/events/message-reaction', async (request, response) => {
        const providedSecret = request.header('X-Internal-Secret');

        if (!providedSecret || providedSecret !== config.internalApiSecret) {
            response.status(401).json({
                success: false,
                message: 'Невалиден вътрешен ключ.',
            });

            return;
        }

        const { recipient_ids, conversation_id, message_id, user_id, type, items } =
            request.body as {
                recipient_ids?: unknown;
                conversation_id?: unknown;
                message_id?: unknown;
                user_id?: unknown;
                type?: unknown;
                items?: unknown;
            };

        const normalizedItems = Array.isArray(items)
            ? items.filter(
                  (item): item is { type: string; count: number } =>
                      Boolean(item) &&
                      typeof item === 'object' &&
                      typeof (item as { type?: unknown }).type === 'string' &&
                      typeof (item as { count?: unknown }).count === 'number',
              )
            : null;

        if (
            !Array.isArray(recipient_ids) ||
            typeof conversation_id !== 'number' ||
            typeof message_id !== 'number' ||
            typeof user_id !== 'number' ||
            !(typeof type === 'string' || type === null) ||
            normalizedItems === null
        ) {
            response.status(422).json({
                success: false,
                message: 'Невалидни данни за реакция.',
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
            message_id,
            user_id,
            type,
            items: normalizedItems,
        };

        let connectedRecipients = 0;
        let deliveredSockets = 0;

        for (const targetUserId of recipientIds) {
            const room = `user:${targetUserId}`;
            const sockets = await io.in(room).fetchSockets();

            if (sockets.length > 0) {
                connectedRecipients += 1;
                deliveredSockets += sockets.length;
            }

            io.to(room).emit('message:reaction', payload);
        }

        console.log(`message:reaction ${message_id} → ${recipientIds.join(', ')}`);

        response.json({
            success: true,
            recipient_count: recipientIds.length,
            connected_recipient_count: connectedRecipients,
            delivered_socket_count: deliveredSockets,
        });
    });

    app.post('/internal/events/notification', async (request, response) => {
        const providedSecret = request.header('X-Internal-Secret');

        if (!providedSecret || providedSecret !== config.internalApiSecret) {
            response.status(401).json({
                success: false,
                message: 'Невалиден вътрешен ключ.',
            });

            return;
        }

        const { recipient_ids, event, notification } = request.body as {
            recipient_ids?: unknown;
            event?: unknown;
            notification?: unknown;
        };

        const allowedEvents = [
            'notification:new',
            'notification:updated',
            'notification:read-all',
            'notification:cleared',
            'notification:deleted',
        ] as const;

        if (
            !Array.isArray(recipient_ids) ||
            typeof event !== 'string' ||
            !allowedEvents.includes(event as (typeof allowedEvents)[number])
        ) {
            response.status(422).json({
                success: false,
                message: 'Невалидни данни за известие.',
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

        if (event !== 'notification:read-all' && event !== 'notification:cleared') {
            if (
                !notification ||
                typeof notification !== 'object' ||
                typeof (notification as AppNotificationPayload).id !== 'number' ||
                typeof (notification as AppNotificationPayload).user_id !== 'number' ||
                typeof (notification as AppNotificationPayload).type !== 'string'
            ) {
                response.status(422).json({
                    success: false,
                    message: 'Подадено е невалидно известие.',
                });

                return;
            }
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

            if (event === 'notification:read-all') {
                io.to(room).emit('notification:read-all', { user_id: recipientId });
            } else if (event === 'notification:cleared') {
                io.to(room).emit('notification:cleared', { user_id: recipientId });
            } else if (event === 'notification:updated') {
                io.to(room).emit('notification:updated', notification as AppNotificationPayload);
            } else if (event === 'notification:deleted') {
                io.to(room).emit('notification:deleted', notification as AppNotificationPayload);
            } else {
                io.to(room).emit('notification:new', notification as AppNotificationPayload);
            }
        }

        console.log(`${event} → ${recipientIds.join(', ')}`);

        response.json({
            success: true,
            recipient_count: recipientIds.length,
            connected_recipient_count: connectedRecipients,
            delivered_socket_count: deliveredSockets,
        });
    });
}
