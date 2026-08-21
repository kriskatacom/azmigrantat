import { describe, expect, it, vi } from 'vitest';

import { registerTypingEvents } from '../../src/socket/typing.events';
import type { TypingAuthorizationProvider } from '../../src/services/conversations/typing-authorization.provider';

function createSocket() {
    const toEmit = vi.fn();
    const listeners: Record<string, (payload: unknown) => void> = {};

    const socket = {
        data: { user: { id: 7 } },
        on: vi.fn((event: string, handler: (payload: unknown) => void) => {
            listeners[event] = handler;
        }),
        to: vi.fn(() => ({ emit: toEmit })),
    };

    return { socket, toEmit, listeners };
}

describe('registerTypingEvents', () => {
    it('не праща typing към потребители извън разговора', async () => {
        const { socket, toEmit, listeners } = createSocket();
        const authorizer: TypingAuthorizationProvider = {
            allowedRecipientIds: vi.fn(async () => [11]),
        };

        registerTypingEvents(socket as never, authorizer);
        listeners['typing:start']?.({
            conversation_id: 3,
            recipient_ids: [11, 99],
        });

        await vi.waitFor(() => {
            expect(authorizer.allowedRecipientIds).toHaveBeenCalledWith(3, 7, [11, 99]);
        });

        expect(toEmit).toHaveBeenCalledTimes(1);
        expect(toEmit).toHaveBeenCalledWith('typing:update', {
            conversation_id: 3,
            user_id: 7,
            is_typing: true,
        });
    });

    it('мълчи без authorizer', () => {
        const { socket, toEmit, listeners } = createSocket();

        registerTypingEvents(socket as never);
        listeners['typing:start']?.({
            conversation_id: 3,
            recipient_ids: [11],
        });

        expect(toEmit).not.toHaveBeenCalled();
    });
});
