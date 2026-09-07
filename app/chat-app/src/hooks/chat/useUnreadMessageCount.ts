import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { getUnreadMessageCount } from "@/services/chat";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

export function useUnreadMessageCount() {
  const { token, user, isAuthenticated } = useAuth();
  const { lastReceivedMessage } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCountedMessageId = useRef(lastReceivedMessage?.id ?? null);

  const refreshUnreadCount = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      setUnreadCount(await getUnreadMessageCount(token));
    } catch (error) {
      console.warn("Непрочетените съобщения не можаха да бъдат заредени:", error);
    }
  }, [isAuthenticated, token]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadCount();
    }, [refreshUnreadCount]),
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      lastCountedMessageId.current = null;
      return;
    }
    if (
      lastReceivedMessage &&
      Number(lastReceivedMessage.id) !== Number(lastCountedMessageId.current) &&
      Number(lastReceivedMessage.sender_id) !== Number(user?.id)
    ) {
      lastCountedMessageId.current = lastReceivedMessage.id;
      setUnreadCount((current) => current + 1);
    }
  }, [isAuthenticated, lastReceivedMessage, user?.id]);

  return unreadCount;
}
