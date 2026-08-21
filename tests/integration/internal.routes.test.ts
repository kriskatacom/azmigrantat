import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config', () => ({
    config: {
        internalApiSecret: 'test-internal-secret',
    },
}));

import { registerInternalRoutes } from '../../src/routes/internal.routes';

const validMessage = {
    id: 100,
    conversation_id: 20,
    sender_id: 5,
    client_message_id: 'client-message-100',
    type: 'text',
    content: 'Тестово съобщение',
    metadata: null,
    status: 'sent',
    delivered_at: null,
    read_at: null,
    edited_at: null,
    created_at: '2026-08-08T10:00:00.000Z',
    sender: {
        id: 5,
        name: 'Sender',
        role: 'user',
        is_active: true,
    },
};

type RoomSocketCounts = Record<string, number>;

function createIo(roomSocketCounts: RoomSocketCounts = {}) {
    const emit = vi.fn();

    const fetchSockets = vi.fn(async (room: string) => {
        const socketCount = roomSocketCounts[room] ?? 0;

        return Array.from({ length: socketCount }, (_, index) => ({
            id: `${room}-socket-${index + 1}`,
        }));
    });

    const inRoom = vi.fn((room: string) => ({
        fetchSockets: () => fetchSockets(room),
    }));

    const toRoom = vi.fn((room: string) => ({
        emit: (event: string, payload: unknown) => emit(room, event, payload),
    }));

    const io = {
        in: inRoom,
        to: toRoom,
    } as unknown as Parameters<typeof registerInternalRoutes>[1];

    return {
        io,
        emit,
        fetchSockets,
        inRoom,
        toRoom,
    };
}

function createTestApp(roomSocketCounts: RoomSocketCounts = {}) {
    const app = express();
    const socketServer = createIo(roomSocketCounts);

    app.use(express.json());

    registerInternalRoutes(app, socketServer.io);

    return {
        app,
        ...socketServer,
    };
}

describe('internal routes', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    describe('POST /internal/events/message', () => {
        it('връща 401 при липсващ вътрешен ключ', async () => {
            const { app, emit } = createTestApp();

            const response = await request(app)
                .post('/internal/events/message')
                .send({
                    recipient_ids: [10],
                    message: validMessage,
                });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: 'Невалиден вътрешен ключ.',
            });

            expect(emit).not.toHaveBeenCalled();
        });

        it('връща 401 при неправилен вътрешен ключ', async () => {
            const { app, emit } = createTestApp();

            const response = await request(app)
                .post('/internal/events/message')
                .set('X-Internal-Secret', 'wrong-secret')
                .send({
                    recipient_ids: [10],
                    message: validMessage,
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Невалиден вътрешен ключ.');

            expect(emit).not.toHaveBeenCalled();
        });

        it('връща 422 при липсващи получатели', async () => {
            const { app } = createTestApp();

            const response = await request(app)
                .post('/internal/events/message')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    recipient_ids: [],
                    message: validMessage,
                });

            expect(response.status).toBe(422);
            expect(response.body).toEqual({
                success: false,
                message: 'Липсват получатели.',
            });
        });

        it.each([
            ['липсващо съобщение', undefined],
            ['null съобщение', null],
            [
                'невалиден message ID',
                {
                    ...validMessage,
                    id: '100',
                },
            ],
            [
                'невалиден conversation ID',
                {
                    ...validMessage,
                    conversation_id: '20',
                },
            ],
            [
                'невалиден sender ID',
                {
                    ...validMessage,
                    sender_id: '5',
                },
            ],
        ])('връща 422 при %s', async (_scenario, message) => {
            const { app } = createTestApp();

            const response = await request(app)
                .post('/internal/events/message')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    recipient_ids: [10],
                    message,
                });

            expect(response.status).toBe(422);
            expect(response.body).toEqual({
                success: false,
                message: 'Подадено е невалидно съобщение.',
            });
        });

        it('връща 422, когато няма валидни получатели', async () => {
            const { app, emit } = createTestApp();

            const response = await request(app)
                .post('/internal/events/message')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    recipient_ids: [0, -1, 2.5, 'invalid', null],
                    message: validMessage,
                });

            expect(response.status).toBe(422);
            expect(response.body).toEqual({
                success: false,
                message: 'Няма валидни получатели.',
            });

            expect(emit).not.toHaveBeenCalled();
        });

        it('изпраща message:new към уникалните получатели и sender room-а', async () => {
            const { app, emit, inRoom, toRoom } = createTestApp({
                'user:5': 2,
                'user:10': 2,
                'user:20': 0,
                'user:30': 1,
            });

            const response = await request(app)
                .post('/internal/events/message')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    recipient_ids: [10, 20, 10, 30, -1, 2.5],
                    message: validMessage,
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                recipient_count: 3,
                connected_recipient_count: 2,
                delivered_socket_count: 3,
            });

            expect(inRoom).toHaveBeenCalledTimes(4);
            expect(inRoom).toHaveBeenNthCalledWith(1, 'user:10');
            expect(inRoom).toHaveBeenNthCalledWith(2, 'user:20');
            expect(inRoom).toHaveBeenNthCalledWith(3, 'user:30');
            expect(inRoom).toHaveBeenNthCalledWith(4, 'user:5');

            expect(toRoom).toHaveBeenCalledTimes(4);

            expect(emit).toHaveBeenNthCalledWith(1, 'user:10', 'message:new', validMessage);
            expect(emit).toHaveBeenNthCalledWith(2, 'user:20', 'message:new', validMessage);
            expect(emit).toHaveBeenNthCalledWith(3, 'user:30', 'message:new', validMessage);
            expect(emit).toHaveBeenNthCalledWith(4, 'user:5', 'message:new', validMessage);
        });

        it('не emit-ва два пъти, когато sender room вече е сред получателите', async () => {
            const { app, emit, toRoom } = createTestApp({
                'user:5': 2,
                'user:10': 1,
            });

            const response = await request(app)
                .post('/internal/events/message')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    recipient_ids: [10, 5, 10, 5],
                    message: validMessage,
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                recipient_count: 2,
                connected_recipient_count: 2,
                delivered_socket_count: 3,
            });

            expect(toRoom).toHaveBeenCalledTimes(2);
            expect(emit).toHaveBeenCalledTimes(2);
            expect(emit).toHaveBeenNthCalledWith(1, 'user:10', 'message:new', validMessage);
            expect(emit).toHaveBeenNthCalledWith(2, 'user:5', 'message:new', validMessage);
        });

        it('игнорира top-level sender_id и използва sender_id от message contract-а', async () => {
            const { app, emit } = createTestApp();

            const response = await request(app)
                .post('/internal/events/message')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    recipient_ids: [10],
                    sender_id: 999,
                    message: validMessage,
                });

            expect(response.status).toBe(200);
            expect(emit).toHaveBeenCalledTimes(2);
            expect(emit).toHaveBeenNthCalledWith(1, 'user:10', 'message:new', validMessage);
            expect(emit).toHaveBeenNthCalledWith(2, 'user:5', 'message:new', validMessage);
            expect(emit).not.toHaveBeenCalledWith('user:999', 'message:new', validMessage);
        });
    });

    describe('POST /internal/events/message-read', () => {
        const validPayload = {
            recipient_ids: [10, 20],
            conversation_id: 50,
            reader_id: 5,
            last_read_message_id: 500,
            read_at: '2026-08-08T10:30:00.000Z',
        };

        it('връща 401 при липсващ вътрешен ключ', async () => {
            const { app, emit } = createTestApp();

            const response = await request(app)
                .post('/internal/events/message-read')
                .send(validPayload);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: 'Невалиден вътрешен ключ.',
            });

            expect(emit).not.toHaveBeenCalled();
        });

        it('връща 401 при неправилен вътрешен ключ', async () => {
            const { app } = createTestApp();

            const response = await request(app)
                .post('/internal/events/message-read')
                .set('X-Internal-Secret', 'wrong-secret')
                .send(validPayload);

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Невалиден вътрешен ключ.');
        });

        it.each([
            [
                'невалидни recipient IDs',
                {
                    ...validPayload,
                    recipient_ids: 'invalid',
                },
            ],
            [
                'невалиден conversation ID',
                {
                    ...validPayload,
                    conversation_id: '50',
                },
            ],
            [
                'невалиден reader ID',
                {
                    ...validPayload,
                    reader_id: '5',
                },
            ],
            [
                'невалиден last read message ID',
                {
                    ...validPayload,
                    last_read_message_id: '500',
                },
            ],
            [
                'невалидна read дата',
                {
                    ...validPayload,
                    read_at: null,
                },
            ],
        ])('връща 422 при %s', async (_scenario, payload) => {
            const { app } = createTestApp();

            const response = await request(app)
                .post('/internal/events/message-read')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send(payload);

            expect(response.status).toBe(422);
            expect(response.body).toEqual({
                success: false,
                message: 'Невалидни данни за прочетено съобщение.',
            });
        });

        it('връща 422, когато няма валидни получатели', async () => {
            const { app, emit } = createTestApp();

            const response = await request(app)
                .post('/internal/events/message-read')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    ...validPayload,
                    recipient_ids: [0, -1, 1.5, 'invalid'],
                });

            expect(response.status).toBe(422);
            expect(response.body).toEqual({
                success: false,
                message: 'Няма валидни получатели.',
            });

            expect(emit).not.toHaveBeenCalled();
        });

        it('изпраща message:read към уникалните валидни получатели', async () => {
            const { app, emit } = createTestApp({
                'user:10': 1,
                'user:20': 3,
                'user:30': 0,
            });

            const response = await request(app)
                .post('/internal/events/message-read')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    ...validPayload,
                    recipient_ids: [10, 20, 10, 30, -5],
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                recipient_count: 3,
                connected_recipient_count: 2,
                delivered_socket_count: 4,
            });

            const expectedEventPayload = {
                conversation_id: 50,
                reader_id: 5,
                last_read_message_id: 500,
                read_at: '2026-08-08T10:30:00.000Z',
            };

            expect(emit).toHaveBeenCalledTimes(3);

            expect(emit).toHaveBeenNthCalledWith(
                1,
                'user:10',
                'message:read',
                expectedEventPayload,
            );
            expect(emit).toHaveBeenNthCalledWith(
                2,
                'user:20',
                'message:read',
                expectedEventPayload,
            );
            expect(emit).toHaveBeenNthCalledWith(
                3,
                'user:30',
                'message:read',
                expectedEventPayload,
            );
        });
    });

    describe('POST /internal/events/notification', () => {
        const notification = {
            id: 9,
            user_id: 44,
            type: 'missed_video_call',
            title: 'Caller',
            message: 'Имате 1 пропуснато видео обаждане!',
            count: 1,
            is_read: false,
            actor_id: 22,
            entity_id: 'call-1',
            data: { call_id: 'call-1' },
            created_at: '2026-08-20T10:00:00.000Z',
            updated_at: '2026-08-20T10:00:00.000Z',
            actor: { id: 22, name: 'Caller' },
        };

        it('изпраща notification:new към получателя', async () => {
            const { app, emit } = createTestApp({ 'user:44': 1 });

            const response = await request(app)
                .post('/internal/events/notification')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    recipient_ids: [44],
                    event: 'notification:new',
                    notification,
                });

            expect(response.status).toBe(200);
            expect(emit).toHaveBeenCalledWith('user:44', 'notification:new', notification);
        });

        it('изпраща notification:updated при групиране', async () => {
            const { app, emit } = createTestApp({ 'user:44': 1 });

            const response = await request(app)
                .post('/internal/events/notification')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    recipient_ids: [44],
                    event: 'notification:updated',
                    notification: { ...notification, count: 2 },
                });

            expect(response.status).toBe(200);
            expect(emit).toHaveBeenCalledWith('user:44', 'notification:updated', {
                ...notification,
                count: 2,
            });
        });

        it('изпраща notification:read-all без notification payload', async () => {
            const { app, emit } = createTestApp({ 'user:44': 1 });

            const response = await request(app)
                .post('/internal/events/notification')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    recipient_ids: [44],
                    event: 'notification:read-all',
                });

            expect(response.status).toBe(200);
            expect(emit).toHaveBeenCalledWith('user:44', 'notification:read-all', { user_id: 44 });
        });

        it('изпраща notification:deleted с payload на известието', async () => {
            const { app, emit } = createTestApp({ 'user:44': 1 });

            const response = await request(app)
                .post('/internal/events/notification')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    recipient_ids: [44],
                    event: 'notification:deleted',
                    notification,
                });

            expect(response.status).toBe(200);
            expect(emit).toHaveBeenCalledWith('user:44', 'notification:deleted', notification);
        });

        it('изпраща notification:cleared без notification payload', async () => {
            const { app, emit } = createTestApp({ 'user:44': 1 });

            const response = await request(app)
                .post('/internal/events/notification')
                .set('X-Internal-Secret', 'test-internal-secret')
                .send({
                    recipient_ids: [44],
                    event: 'notification:cleared',
                });

            expect(response.status).toBe(200);
            expect(emit).toHaveBeenCalledWith('user:44', 'notification:cleared', { user_id: 44 });
        });
    });
});
