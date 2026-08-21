import { useAuth } from "@/hooks/useAuth";
import {
  connectSocket,
  disconnectSocket,
  MessageReadPayload,
  PresencePayload,
  TypingPayload,
  type AppSocket,
} from "@/services/socket";

import type { AuthUser } from "@/types/auth";
import type { ChatMessage } from "@/types/chat";
import type { AppNotification, NotificationSocketEvent } from "@/types/notifications";

import { getActiveConversationId } from "@/services/notificationState";
import { playAppSound } from "@/services/sounds";
import { vibrateForIncomingAlert } from "@/services/user-settings";
import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";

interface ConnectionReadyPayload {
  user: AuthUser;
  socketId: string;
}

interface SocketContextValue {
  socket: AppSocket | null;

  isConnected: boolean;
  isConnecting: boolean;

  connectionError: string | null;

  lastReceivedMessage: ChatMessage | null;
  lastReadReceipt: MessageReadPayload | null;
  lastTypingUpdate: TypingPayload | null;

  lastPresenceUpdate: PresencePayload | null;
  lastPresenceStatus: PresencePayload | null;
  lastNotification: AppNotification | null;
  lastNotificationEvent: NotificationSocketEvent | null;
  lastNotificationEventAt: number;
}

export const SocketContext = createContext<SocketContextValue | undefined>(
  undefined,
);

export function SocketProvider({ children }: PropsWithChildren) {
  const { token, user, isAuthenticated, isLoading } = useAuth();

  const [socket, setSocket] = useState<AppSocket | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  const [isConnecting, setIsConnecting] = useState(false);

  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [lastReceivedMessage, setLastReceivedMessage] =
    useState<ChatMessage | null>(null);

  const [lastReadReceipt, setLastReadReceipt] =
    useState<MessageReadPayload | null>(null);

  const [lastTypingUpdate, setLastTypingUpdate] =
    useState<TypingPayload | null>(null);

  const [lastPresenceUpdate, setLastPresenceUpdate] =
    useState<PresencePayload | null>(null);

  const [lastPresenceStatus, setLastPresenceStatus] =
    useState<PresencePayload | null>(null);
  const [lastNotification, setLastNotification] =
    useState<AppNotification | null>(null);
  const [lastNotificationEvent, setLastNotificationEvent] =
    useState<NotificationSocketEvent | null>(null);
  const [lastNotificationEventAt, setLastNotificationEventAt] = useState(0);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !token) {
      disconnectSocket();

      setSocket(null);

      setIsConnected(false);
      setIsConnecting(false);

      setConnectionError(null);

      setLastReceivedMessage(null);
      setLastReadReceipt(null);
      setLastTypingUpdate(null);
      setLastPresenceUpdate(null);
      setLastPresenceStatus(null);
      setLastNotification(null);
      setLastNotificationEvent(null);
      setLastNotificationEventAt(0);

      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    const currentSocket = connectSocket(token, {
      appState: AppState.currentState === "active" ? "active" : "background",
    });

    setSocket(currentSocket);

    const handleConnect = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);

      console.log("Socket.IO връзката е установена.");
    };

    const handleConnectionReady = (payload: ConnectionReadyPayload) => {
      console.log("Получено connection:ready:", payload);
    };

    const handleTypingUpdate = (payload: TypingPayload) => {
      console.log("Получено typing:update:", payload);

      setLastTypingUpdate(payload);
    };

    const handlePresenceUpdate = (payload: PresencePayload) => {
      console.log("Получено presence:update:", payload);

      setLastPresenceUpdate(payload);
    };

    const handlePresenceStatus = (payload: PresencePayload) => {
      console.log("Получено presence:status:", payload);

      setLastPresenceStatus(payload);
    };

    const handleNewMessage = (message: ChatMessage) => {
      setLastReceivedMessage(message);

      const isIncoming = Number(message.sender_id) !== Number(user?.id);
      const isCurrentConversation =
        getActiveConversationId() !== null &&
        Number(message.conversation_id) === Number(getActiveConversationId());

      if (isIncoming) {
        if (isCurrentConversation) {
          playAppSound("receiveMessageInChatRoom");
        } else {
          playAppSound("receiveMessage");
          vibrateForIncomingAlert();
        }
      }

      console.log("Получено message:new:", message);
    };

    const handleMessageRead = (payload: MessageReadPayload) => {
      setLastReadReceipt(payload);

      console.log("Получено message:read:", payload);
    };

    const handleNotificationNew = (notification: AppNotification) => {
      setLastNotification(notification);
      setLastNotificationEvent("new");
      setLastNotificationEventAt(Date.now());
      vibrateForIncomingAlert();
    };

    const handleNotificationUpdated = (notification: AppNotification) => {
      setLastNotification(notification);
      setLastNotificationEvent("updated");
      setLastNotificationEventAt(Date.now());
    };

    const handleNotificationReadAll = () => {
      setLastNotification(null);
      setLastNotificationEvent("read-all");
      setLastNotificationEventAt(Date.now());
    };

    const handleNotificationCleared = () => {
      setLastNotification(null);
      setLastNotificationEvent("cleared");
      setLastNotificationEventAt(Date.now());
    };

    const handleNotificationDeleted = (notification: AppNotification) => {
      setLastNotification(notification);
      setLastNotificationEvent("deleted");
      setLastNotificationEventAt(Date.now());
    };

    const handleConnectError = (error: Error) => {
      setIsConnected(false);
      setIsConnecting(false);

      setConnectionError(error.message);

      console.log("Socket.IO connect_error:", error.message);
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      setIsConnecting(false);

      console.log("Socket.IO връзката е прекъсната:", reason);
    };

    const handleReconnectAttempt = () => {
      setIsConnecting(true);
    };

    currentSocket.on("connect", handleConnect);

    currentSocket.on("connection:ready", handleConnectionReady);

    currentSocket.on("message:new", handleNewMessage);

    currentSocket.on("message:read", handleMessageRead);

    currentSocket.on("notification:new", handleNotificationNew);
    currentSocket.on("notification:updated", handleNotificationUpdated);
    currentSocket.on("notification:read-all", handleNotificationReadAll);
    currentSocket.on("notification:cleared", handleNotificationCleared);
    currentSocket.on("notification:deleted", handleNotificationDeleted);

    currentSocket.on("typing:update", handleTypingUpdate);

    currentSocket.on("presence:update", handlePresenceUpdate);

    currentSocket.on("presence:status", handlePresenceStatus);

    currentSocket.on("connect_error", handleConnectError);

    currentSocket.on("disconnect", handleDisconnect);

    currentSocket.io.on("reconnect_attempt", handleReconnectAttempt);

    return () => {
      currentSocket.off("connect", handleConnect);

      currentSocket.off("connection:ready", handleConnectionReady);

      currentSocket.off("message:new", handleNewMessage);

      currentSocket.off("message:read", handleMessageRead);

      currentSocket.off("notification:new", handleNotificationNew);
      currentSocket.off("notification:updated", handleNotificationUpdated);
      currentSocket.off("notification:read-all", handleNotificationReadAll);
      currentSocket.off("notification:cleared", handleNotificationCleared);
      currentSocket.off("notification:deleted", handleNotificationDeleted);

      currentSocket.off("typing:update", handleTypingUpdate);

      currentSocket.off("presence:update", handlePresenceUpdate);

      currentSocket.off("presence:status", handlePresenceStatus);

      currentSocket.off("connect_error", handleConnectError);

      currentSocket.off("disconnect", handleDisconnect);

      currentSocket.io.off("reconnect_attempt", handleReconnectAttempt);
    };
  }, [token, user?.id, isAuthenticated, isLoading]);

  const value = useMemo<SocketContextValue>(
    () => ({
      socket,

      isConnected,
      isConnecting,

      connectionError,

      lastReceivedMessage,
      lastReadReceipt,
      lastTypingUpdate,
      lastPresenceUpdate,
      lastPresenceStatus,
      lastNotification,
      lastNotificationEvent,
      lastNotificationEventAt,
    }),
    [
      socket,

      isConnected,
      isConnecting,

      connectionError,

      lastReceivedMessage,
      lastReadReceipt,
      lastTypingUpdate,

      lastPresenceUpdate,
      lastPresenceStatus,
      lastNotification,
      lastNotificationEvent,
      lastNotificationEventAt,
    ],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}
