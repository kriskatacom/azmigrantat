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
    mine_reaction?: string | null;
    reactions?: Array<{ type: string; count: number; reacted?: boolean }>;
    sender: AuthenticatedUser | null;
}

export interface NewMessageEventPayload {
    recipient_ids: number[];
    message: RealtimeMessage;
}

export interface PresencePayload {
    user_id: number;
    is_online: boolean;
}

export interface ServerToClientEvents {
    'connection:ready': (payload: { user: AuthenticatedUser; socketId: string }) => void;

    'message:new': (message: RealtimeMessage) => void;
    'message:delivered': (payload: MessageDeliveredPayload) => void;
    'message:read': (payload: MessageReadPayload) => void;
    'message:reaction': (payload: MessageReactionPayload) => void;
    'typing:update': (payload: TypingPayload) => void;

    'presence:update': (payload: PresencePayload) => void;
    'presence:status': (payload: PresencePayload) => void;

    'call:offer': (payload: CallOfferServerPayload) => void;
    'call:answer': (payload: CallAnswerServerPayload) => void;
    'call:accepted': (payload: CallAcceptedServerPayload) => void;
    'call:ice-candidate': (payload: CallIceCandidateServerPayload) => void;
    'call:camera-state': (payload: CallCameraStateServerPayload) => void;
    'call:end': (payload: CallEndServerPayload) => void;
    'call:state': (payload: CallStatePayload) => void;
    'call:battery-warning': (payload: CallBatteryWarningPayload) => void;

    'notification:new': (payload: AppNotificationPayload) => void;
    'notification:updated': (payload: AppNotificationPayload) => void;
    'notification:read-all': (payload: { user_id: number }) => void;
    'notification:cleared': (payload: { user_id: number }) => void;
    'notification:deleted': (payload: AppNotificationPayload) => void;
    'user:blocked': (payload: UserBlockPayload) => void;
    'user:unblocked': (payload: UserBlockPayload) => void;
    'conversation:cleared': (payload: ConversationClearedPayload) => void;
    'auth:revoked': (payload: { reason: string }) => void;
}

export interface ClientToServerEvents {
    'typing:start': (payload: TypingClientPayload) => void;
    'typing:stop': (payload: TypingClientPayload) => void;

    'presence:check': (payload: PresenceCheckPayload) => void;

    'call:offer': (payload: CallOfferClientPayload) => void;
    'call:answer': (payload: CallAnswerClientPayload) => void;
    'call:accept': (payload: CallAcceptClientPayload) => void;
    'call:ice-candidate': (payload: CallIceCandidateClientPayload) => void;
    'call:camera-state': (payload: CallCameraStateClientPayload) => void;
    'call:end': (payload: CallEndClientPayload) => void;
    'call:sync': () => void;
    'device:register': (payload: DeviceRegisterPayload) => void;
    'device:battery': (payload: DeviceBatteryPayload) => void;
    'app:state': (payload: AppStatePayload) => void;
}

export interface InterServerEvents {}

export interface SocketData {
    user: AuthenticatedUser;
    tokenHash?: string;
    appState?: 'active' | 'background';
    battery?: DeviceBatterySnapshot;
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

export interface MessageDeliveredPayload {
    conversation_id: number;
    recipient_id: number;
    last_delivered_message_id: number;
    delivered_at: string;
}

export interface MessageDeliveredEventPayload extends MessageDeliveredPayload {
    recipient_ids: number[];
}

export interface MessageReactionPayload {
    conversation_id: number;
    message_id: number;
    user_id: number;
    type: string | null;
    items: Array<{ type: string; count: number }>;
}

export interface MessageReactionEventPayload extends MessageReactionPayload {
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

export interface PresenceCheckPayload {
    user_id: number;
}

export interface PresencePayload {
    user_id: number;
    is_online: boolean;
    last_seen_at: string | null;
}

export interface SessionDescriptionPayload {
    type: 'offer' | 'answer';
    sdp: string;
}

export interface IceCandidatePayload {
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
    usernameFragment?: string | null;
}

interface CallClientPayload {
    call_id: string;
    recipient_id: number;
}

interface CallServerPayload {
    call_id: string;
    sender_id: number;
}

export interface CallOfferClientPayload extends CallClientPayload {
    description: SessionDescriptionPayload;
    call_type?: 'audio' | 'video';
}

export interface CallOfferServerPayload extends CallServerPayload {
    description: SessionDescriptionPayload;
    caller_name?: string;
    caller_avatar?: string | null;
    call_type?: 'audio' | 'video';
    timestamp?: number;
}

export interface CallAcceptClientPayload extends CallClientPayload {}

export interface CallAcceptedServerPayload extends CallServerPayload {}

export interface CallBatteryWarningPayload {
    call_id: string;
    low_battery_user_ids: number[];
}

export interface CallAnswerClientPayload extends CallClientPayload {
    description: SessionDescriptionPayload;
}

export interface CallAnswerServerPayload extends CallServerPayload {
    description: SessionDescriptionPayload;
}

export interface CallIceCandidateClientPayload extends CallClientPayload {
    candidate: IceCandidatePayload;
}

export interface CallIceCandidateServerPayload extends CallServerPayload {
    candidate: IceCandidatePayload;
}

export interface CallCameraStateClientPayload extends CallClientPayload {
    enabled: boolean;
}

export interface CallCameraStateServerPayload extends CallServerPayload {
    enabled: boolean;
}

export interface CallEndClientPayload extends CallClientPayload {
    reason?: string;
}

export interface CallEndServerPayload extends CallServerPayload {
    reason?: string;
}

export interface CallStatePayload {
    call: CallOfferServerPayload | null;
    pending_ice_candidates: IceCandidatePayload[];
    status: 'ringing' | 'accepted' | 'idle';
}

export interface DeviceRegisterPayload {
    expo_push_token?: string;
    app_state?: 'active' | 'background';
    batteryLevel?: number;
    isCharging?: boolean;
    updatedAt?: number;
}

export interface DeviceBatteryPayload {
    batteryLevel: number;
    isCharging: boolean;
    updatedAt: number;
}

export interface DeviceBatterySnapshot extends DeviceBatteryPayload {
    receivedAt: number;
}

export interface AppStatePayload {
    app_state: 'active' | 'background';
}

export interface UserBlockPayload {
    blocker_id: number;
    blocked_id: number;
    blocked: boolean;
}

export interface ConversationClearedPayload {
    conversation_id: number;
    actor_id: number;
    scope: 'me' | 'both';
    messages: 'mine' | 'all';
}

export interface AppNotificationActor {
    id: number;
    name: string;
    username?: string | null;
    profile_image?: string | null;
    is_active?: boolean;
}

export interface AppNotificationPayload {
    id: number;
    user_id: number;
    type: string;
    title: string | null;
    message: string | null;
    count: number;
    is_read: boolean;
    actor_id: number | null;
    entity_id: string | null;
    data: Record<string, unknown> | null;
    created_at: string | null;
    updated_at: string | null;
    actor: AppNotificationActor | null;
}
