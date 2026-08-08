import type { Server } from 'socket.io';

import type { AuthenticatedUser } from './socket';

export interface RealtimeMessage {
    id: number;
    conversation_id: number;
    sender_id: number;
    client_message_id: string | null;
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
    content: string | null;
    metadata: Record<string, unknown> | null;
    status: 'sent' | 'delivered' | 'read';
    delivered_at: string | null;
    read_at: string | null;
    edited_at: string | null;
    created_at: string | null;
    sender: AuthenticatedUser | null;
}

export interface NewMessageEventPayload {
    recipient_ids: number[];
    message: RealtimeMessage;
}

export interface ServerToClientEvents {
    'connection:ready': (payload: { user: AuthenticatedUser; socketId: string }) => void;

    'message:new': (message: RealtimeMessage) => void;
    'message:read': (payload: MessageReadPayload) => void;
    'typing:update': (payload: TypingPayload) => void;
}

export interface ClientToServerEvents {
    'typing:start': (payload: TypingClientPayload) => void;
    'typing:stop': (payload: TypingClientPayload) => void;
}

export interface InterServerEvents {}

export interface SocketData {
    user: AuthenticatedUser;
}

export type RealtimeServer = Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

export interface MessageReadPayload {
    conversation_id: number;
    reader_id: number;
    last_read_message_id: number;
    read_at: string;
}

export interface MessageReadEventPayload extends MessageReadPayload {
    recipient_ids: number[];
}

export interface TypingPayload {
    conversation_id: number;
    user_id: number;
    is_typing: boolean;
}

export interface TypingClientPayload {
    conversation_id: number;
    recipient_ids: number[];
}
