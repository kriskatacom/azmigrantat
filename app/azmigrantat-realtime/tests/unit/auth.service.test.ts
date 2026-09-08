import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config', () => ({
    config: {
        phpApiUrl: 'https://api.example.com',
    },
}));

import { authenticateAccessToken } from '../../src/services/auth.service';

const fetchMock = vi.fn();

function createResponse(
    data: unknown,
    options: {
        ok?: boolean;
        status?: number;
    } = {},
) {
    return {
        ok: options.ok ?? true,
        status: options.status ?? 200,
        text: vi.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
    };
}

describe('authenticateAccessToken', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('връща потребителя при валиден access token', async () => {
        const user = {
            id: 15,
            name: 'Test User',
            email: 'test@example.com',
            is_active: true,
            role: 'user',
        };

        fetchMock.mockResolvedValue(
            createResponse({
                success: true,
                user,
            }),
        );

        const result = await authenticateAccessToken('valid-token');

        expect(result).toEqual(user);

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.example.com/api/mobile/me',
            expect.objectContaining({
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: 'Bearer valid-token',
                },
                signal: expect.any(AbortSignal),
            }),
        );
    });

    it('връща грешката от PHP API при невалиден token', async () => {
        fetchMock.mockResolvedValue(
            createResponse(
                {
                    success: false,
                    message: 'Token-ът е невалиден.',
                },
                {
                    ok: false,
                    status: 401,
                },
            ),
        );

        await expect(authenticateAccessToken('invalid-token')).rejects.toThrow(
            'Token-ът е невалиден.',
        );
    });

    it('връща стандартна грешка, когато API не предостави съобщение', async () => {
        fetchMock.mockResolvedValue(
            createResponse(
                {
                    success: false,
                },
                {
                    ok: false,
                    status: 401,
                },
            ),
        );

        await expect(authenticateAccessToken('invalid-token')).rejects.toThrow(
            'Access token-ът е невалиден.',
        );
    });

    it('хвърля грешка при невалиден JSON от PHP API', async () => {
        fetchMock.mockResolvedValue(createResponse('<html>Server error</html>'));

        await expect(authenticateAccessToken('valid-token')).rejects.toThrow(
            'PHP API върна невалиден JSON: <html>Server error</html>',
        );
    });

    it('хвърля грешка, когато API не върне потребител', async () => {
        fetchMock.mockResolvedValue(
            createResponse({
                success: true,
                user: null,
            }),
        );

        await expect(authenticateAccessToken('valid-token')).rejects.toThrow(
            'PHP API не върна валиден потребител.',
        );
    });

    it('хвърля грешка, когато потребителят няма ID', async () => {
        fetchMock.mockResolvedValue(
            createResponse({
                success: true,
                user: {
                    name: 'Test User',
                    is_active: true,
                },
            }),
        );

        await expect(authenticateAccessToken('valid-token')).rejects.toThrow(
            'PHP API не върна валиден потребител.',
        );
    });

    it('отхвърля неактивен потребител', async () => {
        fetchMock.mockResolvedValue(
            createResponse({
                success: true,
                user: {
                    id: 15,
                    name: 'Inactive User',
                    is_active: false,
                },
            }),
        );

        await expect(authenticateAccessToken('valid-token')).rejects.toThrow(
            'Потребителският профил е неактивен.',
        );
    });

    it('прекратява заявката след 10 секунди', async () => {
        vi.useFakeTimers();

        fetchMock.mockImplementation(
            (
                _url: string,
                options: {
                    signal: AbortSignal;
                },
            ) =>
                new Promise((_resolve, reject) => {
                    options.signal.addEventListener('abort', () => {
                        const error = new Error('Aborted');
                        error.name = 'AbortError';

                        reject(error);
                    });
                }),
        );

        const authenticationPromise = authenticateAccessToken('valid-token');

        const expectation = expect(authenticationPromise).rejects.toThrow(
            'PHP API не отговори в рамките на допустимото време.',
        );

        await vi.advanceTimersByTimeAsync(10_000);
        await expectation;
    });
});
