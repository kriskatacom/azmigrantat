import { config } from '../config';
import type { AuthenticatedUser, MeApiResponse } from '../types/socket';

interface ApiErrorResponse {
    success?: false;
    message?: string;
}

export async function authenticateAccessToken(token: string): Promise<AuthenticatedUser> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 10_000);

    try {
        const response = await fetch(`${config.phpApiUrl}/api/mobile/me`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
        });

        const rawResponse = await response.text();

        let data: MeApiResponse | ApiErrorResponse;

        try {
            data = JSON.parse(rawResponse);
        } catch {
            throw new Error(`PHP API върна невалиден JSON: ${rawResponse.slice(0, 200)}`);
        }

        if (!response.ok) {
            const errorData = data as ApiErrorResponse;

            throw new Error(errorData.message ?? 'Access token-ът е невалиден.');
        }

        const successData = data as MeApiResponse;

        if (!successData.success || !successData.user || !successData.user.id) {
            throw new Error('PHP API не върна валиден потребител.');
        }

        if (successData.user.is_active === false) {
            throw new Error('Потребителският профил е неактивен.');
        }

        return successData.user;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('PHP API не отговори в рамките на допустимото време.');
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
