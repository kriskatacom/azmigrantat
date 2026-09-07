import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { getUnreadNotificationCount } from "@/services/notifications-api";
import { isNotificationUnread } from "@/types/notifications";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

export function useUnreadNotificationCount() {
  const { token, isAuthenticated } = useAuth();
  const { lastNotification, lastNotificationEvent, lastNotificationEventAt } =
    useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastEventAt = useRef(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      setUnreadCount(await getUnreadNotificationCount(token));
    } catch (error) {
      console.warn("Непрочетените известия не можаха да бъдат заредени:", error);
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
      lastEventAt.current = 0;
      return;
    }

    if (!lastNotificationEvent || lastNotificationEventAt === lastEventAt.current) {
      return;
    }

    lastEventAt.current = lastNotificationEventAt;

    if (lastNotificationEvent === "read-all" || lastNotificationEvent === "cleared") {
      setUnreadCount(0);
      return;
    }

    if (lastNotificationEvent === "new" && lastNotification && isNotificationUnread(lastNotification)) {
      setUnreadCount((current) => current + 1);
      return;
    }

    if (lastNotificationEvent === "updated" && lastNotification && !isNotificationUnread(lastNotification)) {
      setUnreadCount((current) => Math.max(0, current - 1));
      return;
    }

    if (lastNotificationEvent === "deleted" && lastNotification && isNotificationUnread(lastNotification)) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }
  }, [
    isAuthenticated,
    lastNotification,
    lastNotificationEvent,
    lastNotificationEventAt,
  ]);

  return unreadCount;
}
