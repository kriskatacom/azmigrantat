import { type AppSocket, type PresencePayload } from "@/services/socket";

import { useEffect, useMemo, useState } from "react";

type UseInboxPresenceParams = {
  socket: AppSocket | null;
  isConnected: boolean;
  userIds: number[];
  lastPresenceUpdate: PresencePayload | null;
  lastPresenceStatus: PresencePayload | null;
};

export function useInboxPresence({
  socket,
  isConnected,
  userIds,
  lastPresenceUpdate,
  lastPresenceStatus,
}: UseInboxPresenceParams) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(
    () => new Set(),
  );

  const normalizedUserIds = useMemo(
    () =>
      Array.from(
        new Set(
          userIds.map(Number).filter((id) => Number.isInteger(id) && id > 0),
        ),
      ),
    [userIds],
  );

  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    normalizedUserIds.forEach((userId) => {
      socket.emit("presence:check", {
        user_id: userId,
      });
    });
  }, [socket, isConnected, normalizedUserIds]);

  useEffect(() => {
    if (!lastPresenceStatus) {
      return;
    }

    const userId = Number(lastPresenceStatus.user_id);

    if (!normalizedUserIds.includes(userId)) {
      return;
    }

    setOnlineUserIds((current) => {
      const next = new Set(current);

      if (lastPresenceStatus.is_online) {
        next.add(userId);
      } else {
        next.delete(userId);
      }

      return next;
    });
  }, [lastPresenceStatus, normalizedUserIds]);

  useEffect(() => {
    if (!lastPresenceUpdate) {
      return;
    }

    const userId = Number(lastPresenceUpdate.user_id);

    if (!normalizedUserIds.includes(userId)) {
      return;
    }

    setOnlineUserIds((current) => {
      const next = new Set(current);

      if (lastPresenceUpdate.is_online) {
        next.add(userId);
      } else {
        next.delete(userId);
      }

      return next;
    });
  }, [lastPresenceUpdate, normalizedUserIds]);

  useEffect(() => {
    setOnlineUserIds((current) => {
      const allowed = new Set(normalizedUserIds);

      return new Set([...current].filter((id) => allowed.has(id)));
    });
  }, [normalizedUserIds]);

  const isUserOnline = (userId?: number | null) => {
    if (!userId) {
      return false;
    }

    return onlineUserIds.has(Number(userId));
  };

  return {
    onlineUserIds,
    isUserOnline,
  };
}
