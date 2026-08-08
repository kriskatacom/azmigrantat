import { type AppSocket, type PresencePayload } from "@/services/socket";

import { useEffect, useState } from "react";

type UseChatPresenceParams = {
  socket: AppSocket | null;
  isConnected: boolean;

  otherUserId?: number | string;

  lastPresenceUpdate: PresencePayload | null;
  lastPresenceStatus: PresencePayload | null;
};

export function useChatPresence({
  socket,
  isConnected,
  otherUserId,
  lastPresenceUpdate,
  lastPresenceStatus,
}: UseChatPresenceParams) {
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);

  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  useEffect(() => {
    setIsOtherUserOnline(false);
    setLastSeenAt(null);
  }, [otherUserId]);

  useEffect(() => {
    if (!socket || !isConnected || !otherUserId) {
      return;
    }

    const userId = Number(otherUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return;
    }

    socket.emit("presence:check", {
      user_id: userId,
    });
  }, [socket, isConnected, otherUserId]);

  useEffect(() => {
    if (
      !lastPresenceStatus ||
      Number(lastPresenceStatus.user_id) !== Number(otherUserId)
    ) {
      return;
    }

    setIsOtherUserOnline(lastPresenceStatus.is_online);

    setLastSeenAt(lastPresenceStatus.last_seen_at);
  }, [lastPresenceStatus, otherUserId]);

  useEffect(() => {
    if (
      !lastPresenceUpdate ||
      Number(lastPresenceUpdate.user_id) !== Number(otherUserId)
    ) {
      return;
    }

    setIsOtherUserOnline(lastPresenceUpdate.is_online);

    setLastSeenAt(lastPresenceUpdate.last_seen_at);
  }, [lastPresenceUpdate, otherUserId]);

  return {
    isOtherUserOnline,
    lastSeenAt,
  };
}
