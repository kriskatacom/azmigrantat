import { io, type Socket } from "socket.io-client";

import type { AuthUser } from "@/types/auth";
import type { ChatMessage } from "@/types/chat";

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

interface ServerToClientEvents {
  "connection:ready": (payload: ConnectionReadyPayload) => void;
  "message:new": (message: ChatMessage) => void;
  "message:read": (payload: MessageReadPayload) => void;
}

interface ClientToServerEvents {}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function connectSocket(token: string): AppSocket {
  if (socket) {
    socket.auth = { token };

    if (!socket.connected) {
      socket.connect();
    }

    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket"],
    auth: {
      token,
    },
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
