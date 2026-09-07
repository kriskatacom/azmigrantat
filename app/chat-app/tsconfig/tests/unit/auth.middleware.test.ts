import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/auth.service', () => ({
    authenticateAccessToken: vi.fn(),
}));

import { authenticateAccessToken } from '../../src/services/auth.service';
import { registerSocketAuthMiddleware } from '../../src/socket/auth.middleware';

type MiddlewareSocket = {
    handshake: {
        auth?: {
            token?: unknown;
        };
    };
    data: {
        user?: unknown;
    };
};

type NextFunction = (error?: Error) => void;

type SocketMiddleware = (socket: MiddlewareSocket, next: NextFunction) => Promise<void>;

const authenticateMock = vi.mocked(authenticateAccessToken);

function createSocket(token?: unknown): MiddlewareSocket {
    return {
        handshake: {
            auth: token === undefined ? {} : { token },
        },
        data: {},
    };
}

function registerMiddleware(): SocketMiddleware {
    const useMock = vi.fn();

    const io = {
        use: useMock,
    } as unknown as Parameters<typeof registerSocketAuthMiddleware>[0];

    registerSocketAuthMiddleware(io);

    expect(useMock).toHaveBeenCalledOnce();

    return useMock.mock.calls[0][0] as SocketMiddleware;
}

describe('registerSocketAuthMiddleware', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        authenticateMock.mockReset();

        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('регистрира Socket.IO middleware', () => {
        const useMock = vi.fn();

        const io = {
            use: useMock,
        } as unknown as Parameters<typeof registerSocketAuthMiddleware>[0];

        registerSocketAuthMiddleware(io);

        expect(useMock).toHaveBeenCalledOnce();
        expect(useMock).toHaveBeenCalledWith(expect.any(Function));
    });

    it.each([
        ['липсващ token', undefined],
        ['празен token', ''],
        ['token само с интервали', '   '],
        ['число вместо token', 123],
        ['обект вместо token', { value: 'token' }],
    ])('отхвърля заявката при %s', async (_scenario, token) => {
        const middleware = registerMiddleware();
        const socket = createSocket(token);
        const next = vi.fn();

        await middleware(socket, next);

        expect(authenticateMock).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledOnce();

        const error = next.mock.calls[0][0];

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Липсва access token.');
        expect(socket.data.user).toBeUndefined();
    });

    it('автентикира token-а без заобикалящите интервали', async () => {
        const user = {
            id: 15,
            name: 'Test User',
            email: 'test@example.com',
            is_active: true,
        } as Awaited<ReturnType<typeof authenticateAccessToken>>;

        authenticateMock.mockResolvedValue(user);

        const middleware = registerMiddleware();
        const socket = createSocket('   valid-token   ');
        const next = vi.fn();

        await middleware(socket, next);

        expect(authenticateMock).toHaveBeenCalledOnce();
        expect(authenticateMock).toHaveBeenCalledWith('valid-token');

        expect(socket.data.user).toEqual(user);
        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('запазва автентикирания потребител в socket.data.user', async () => {
        const user = {
            id: 25,
            name: 'Socket User',
            is_active: true,
            role: 'user',
        } as Awaited<ReturnType<typeof authenticateAccessToken>>;

        authenticateMock.mockResolvedValue(user);

        const middleware = registerMiddleware();
        const socket = createSocket('valid-token');
        const next = vi.fn();

        await middleware(socket, next);

        expect(socket.data.user).toBe(user);
    });

    it('предава грешката от authentication услугата към next', async () => {
        authenticateMock.mockRejectedValue(new Error('Access token-ът е невалиден.'));

        const middleware = registerMiddleware();
        const socket = createSocket('invalid-token');
        const next = vi.fn();

        await middleware(socket, next);

        expect(next).toHaveBeenCalledOnce();

        const error = next.mock.calls[0][0];

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Access token-ът е невалиден.');
        expect(socket.data.user).toBeUndefined();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Socket authentication error:',
            'Access token-ът е невалиден.',
        );
    });

    it('използва стандартно съобщение при хвърлена стойност, която не е Error', async () => {
        authenticateMock.mockRejectedValue('unknown authentication error');

        const middleware = registerMiddleware();
        const socket = createSocket('valid-token');
        const next = vi.fn();

        await middleware(socket, next);

        expect(next).toHaveBeenCalledOnce();

        const error = next.mock.calls[0][0];

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Неуспешна автентикация.');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Socket authentication error:',
            'Неуспешна автентикация.',
        );
    });
});
