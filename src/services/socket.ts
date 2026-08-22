import { io, type Socket } from "socket.io-client";

import type {
  AppStatePayload,
  CallClientPayload,
  CallServerPayload,
  CallStatePayload,
  DeviceRegisterPayload,
} from "@/services/video-call";
import type { AuthUser } from "@/types/auth";
import type { ChatMessage } from "@/types/chat";
import type { AppNotification } from "@/types/notifications";

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

if (!SOCKET_URL) {
  throw new Error("Липсва EXPO_PUBLIC_SOCKET_URL.");
}

interface ConnectionReadyPayload {
  user: AuthUser;
  socketId: string;
}

export interface MessageReadPayload {
  conversation_id: number;
  reader_id: number;
  last_read_message_id: number;
  read_at: string;
}

export interface MessageDeliveredPayload {
  conversation_id: number;
  recipient_id: number;
  last_delivered_message_id: number;
  delivered_at: string;
}

export interface MessageReactionPayload {
  conversation_id: number;
  message_id: number;
  user_id: number;
  type: string | null;
  items: Array<{ type: string; count: number }>;
}

export interface TypingPayload {
  conversation_id: number;
  user_id: number;
  is_typing: boolean;
}

export interface UserBlockPayload {
  blocker_id: number;
  blocked_id: number;
  blocked: boolean;
}

export interface TypingClientPayload {
  conversation_id: number;
  recipient_ids: number[];
}

export type PresencePayload = {
  user_id: number;
  is_online: boolean;
  last_seen_at: string | null;
};

export interface PresenceCheckPayload {
  user_id: number;
}

interface ServerToClientEvents {
  "connection:ready": (payload: ConnectionReadyPayload) => void;
  "message:new": (message: ChatMessage) => void;
  "message:delivered": (payload: MessageDeliveredPayload) => void;
  "message:read": (payload: MessageReadPayload) => void;
  "message:reaction": (payload: MessageReactionPayload) => void;
  "typing:update": (payload: TypingPayload) => void;

  "presence:update": (payload: PresencePayload) => void;
  "presence:status": (payload: PresencePayload) => void;

  "call:offer": (payload: CallServerPayload) => void;
  "call:answer": (payload: CallServerPayload) => void;
  "call:accepted": (payload: CallServerPayload) => void;
  "call:ice-candidate": (payload: CallServerPayload) => void;
  "call:camera-state": (payload: CallServerPayload) => void;
  "call:end": (payload: CallServerPayload) => void;
  "call:state": (payload: CallStatePayload) => void;
  "notification:new": (payload: AppNotification) => void;
  "notification:updated": (payload: AppNotification) => void;
  "notification:read-all": (payload: { user_id: number }) => void;
  "notification:cleared": (payload: { user_id: number }) => void;
  "notification:deleted": (payload: AppNotification) => void;
  "user:blocked": (payload: UserBlockPayload) => void;
  "user:unblocked": (payload: UserBlockPayload) => void;
  "auth:revoked": (payload: { reason: string }) => void;
}

interface ClientToServerEvents {
  "typing:start": (payload: TypingClientPayload) => void;
  "typing:stop": (payload: TypingClientPayload) => void;

  "presence:check": (payload: PresenceCheckPayload) => void;

  "call:offer": (payload: CallClientPayload) => void;
  "call:answer": (payload: CallClientPayload) => void;
  "call:accept": (payload: CallClientPayload) => void;
  "call:ice-candidate": (payload: CallClientPayload) => void;
  "call:camera-state": (payload: CallClientPayload) => void;
  "call:end": (payload: CallClientPayload) => void;
  "call:sync": () => void;
  "device:register": (payload: DeviceRegisterPayload) => void;
  "app:state": (payload: AppStatePayload) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type SocketConnectExtras = {
  expoPushToken?: string | null;
  appState?: "active" | "background";
};

let socket: AppSocket | null = null;

export function connectSocket(
  token: string,
  extras: SocketConnectExtras = {},
): AppSocket {
  const auth = {
    token,
    expo_push_token: extras.expoPushToken ?? undefined,
    app_state: extras.appState,
  };

  if (socket) {
    socket.auth = auth;

    if (!socket.connected) {
      socket.connect();
    }

    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket"],
    auth,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.connect();

  return socket;
}

export function getSocket(): AppSocket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
