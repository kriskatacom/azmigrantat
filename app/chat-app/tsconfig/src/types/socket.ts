export interface AuthenticatedUser {
    id: number;
    name: string;
    email?: string;
    avatar?: string | null;
    role: string;
    is_active: boolean;
}

export interface MeApiResponse {
    success: true;
    user: AuthenticatedUser;
}

export interface SocketConnectionReadyPayload {
    user: AuthenticatedUser;
    socketId: string;
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
