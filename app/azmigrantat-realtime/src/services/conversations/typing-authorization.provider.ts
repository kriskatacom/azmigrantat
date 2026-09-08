import { config } from '../../config';

export interface TypingAuthorizationProvider {
    allowedRecipientIds(
        conversationId: number,
        senderId: number,
        recipientIds: number[],
    ): Promise<number[]>;
}

export class PhpTypingAuthorizationProvider implements TypingAuthorizationProvider {
    private readonly cache = new Map<string, { expiresAt: number; recipientIds: number[] }>();

    async allowedRecipientIds(
        conversationId: number,
        senderId: number,
        recipientIds: number[],
    ): Promise<number[]> {
        const uniqueRecipients = [
            ...new Set(
                recipientIds.filter((id) => Number.isInteger(id) && id > 0 && id !== senderId),
            ),
        ];

        if (
            !Number.isInteger(conversationId) ||
            conversationId <= 0 ||
            uniqueRecipients.length === 0
        ) {
            return [];
        }

        const cacheKey = `${conversationId}:${senderId}`;
        const cached = this.cache.get(cacheKey);

        if (cached && cached.expiresAt > Date.now()) {
            return uniqueRecipients.filter((id) => cached.recipientIds.includes(id));
        }

        const response = await fetch(`${config.phpApiUrl}/internal/mobile/conversations/typing`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Internal-Secret': config.internalApiSecret,
            },
            body: JSON.stringify({
                conversation_id: conversationId,
                sender_id: senderId,
                recipient_ids: uniqueRecipients,
            }),
            signal: AbortSignal.timeout(5_000),
        });

        if (!response.ok) {
            throw new Error(`PHP typing authorization failed with HTTP ${response.status}.`);
        }

        const payload = (await response.json()) as {
            success?: unknown;
            recipient_ids?: unknown;
        };

        const allowed = Array.isArray(payload.recipient_ids)
            ? payload.recipient_ids.filter((id): id is number => Number.isInteger(id) && id > 0)
            : [];

        this.cache.set(cacheKey, {
            recipientIds: allowed,
            expiresAt: Date.now() + 60_000,
        });

        return uniqueRecipients.filter((id) => allowed.includes(id));
    }
}
