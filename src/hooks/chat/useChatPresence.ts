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

  useEffect(() => {
    if (!socket || !isConnected || !otherUserId) {
      return;
    }

    const userId = Number(otherUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return;
    }

    console.log("Изпращаме presence:check за:", userId);

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

    console.log("Presence status:", lastPresenceStatus);

    setIsOtherUserOnline(lastPresenceStatus.is_online);
  }, [lastPresenceStatus, otherUserId]);

  useEffect(() => {
    if (
      !lastPresenceUpdate ||
      Number(lastPresenceUpdate.user_id) !== Number(otherUserId)
    ) {
      return;
    }

    console.log("Presence update:", lastPresenceUpdate);

    setIsOtherUserOnline(lastPresenceUpdate.is_online);
  }, [lastPresenceUpdate, otherUserId]);

  useEffect(() => {
    setIsOtherUserOnline(false);
  }, [otherUserId]);

  return {
    isOtherUserOnline,
  };
}
