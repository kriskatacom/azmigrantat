import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import InboxLoading from "@/components/inbox/inbox-loading";
import NotificationRow from "@/components/notifications/notification-row";
import NotificationsEmpty from "@/components/notifications/notifications-empty";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { createDirectConversation } from "@/services/chat";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notifications-api";
import type { AppNotification } from "@/types/notifications";
import { isNotificationUnread } from "@/types/notifications";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type LoadMode = "initial" | "refresh";

export default function NotificationsScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const { lastNotification, lastNotificationEvent, lastNotificationEventAt } = useSocket();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDeleteAllVisible, setIsDeleteAllVisible] = useState(false);
  const deletingIdsRef = useRef(new Set<number>());

  const loadNotifications = useCallback(
    async (mode: LoadMode = "initial") => {
      if (!token) {
        setNotifications([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        if (mode === "refresh") setIsRefreshing(true);
        else setIsLoading(true);

        const response = await getNotifications(token, { limit: 30 });
        setNotifications(response.data);
        setHasMore(response.meta.has_more);
      } catch (error) {
        Alert.alert(
          "Грешка",
          error instanceof Error
            ? error.message
            : "Известията не можаха да бъдат заредени.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadNotifications("refresh");
    }, [loadNotifications]),
  );

  useEffect(() => {
    if (!lastNotificationEvent) return;

    if (lastNotificationEvent === "cleared") {
      setNotifications([]);
      return;
    }

    if (lastNotificationEvent === "read-all") {
      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true })),
      );
      return;
    }

    if (lastNotificationEvent === "deleted" && lastNotification) {
      setNotifications((current) =>
        current.filter((item) => item.id !== lastNotification.id),
      );
      return;
    }

    if (!lastNotification) return;

    setNotifications((current) => {
      const existingIndex = current.findIndex(
        (item) => item.id === lastNotification.id,
      );

      if (existingIndex === -1) {
        return [lastNotification, ...current];
      }

      const next = [...current];
      next[existingIndex] = lastNotification;
      next.sort((left, right) => right.id - left.id);
      return next;
    });
  }, [lastNotification, lastNotificationEvent, lastNotificationEventAt]);

  const loadMore = async () => {
    if (!token || !hasMore || isLoadingMore || notifications.length === 0) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const response = await getNotifications(token, {
        limit: 30,
        beforeId: notifications[notifications.length - 1].id,
      });
      setNotifications((current) => [...current, ...response.data]);
      setHasMore(response.meta.has_more);
    } catch (error) {
      console.warn("Следващите известия не можаха да бъдат заредени:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openNotification = async (notification: AppNotification) => {
    if (!token) return;

    if (isNotificationUnread(notification)) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );

      try {
        const updated = await markNotificationAsRead(token, notification.id);
        setNotifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } catch (error) {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? notification : item,
          ),
        );
        console.warn("Известието не можа да бъде маркирано като прочетено:", error);
      }
    }

    const conversationId = Number(notification.data?.conversation_id);
    if (Number.isInteger(conversationId) && conversationId > 0) {
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: String(conversationId),
          userId: notification.actor_id ? String(notification.actor_id) : "",
          title: notification.actor?.name ?? notification.title ?? "",
          image: notification.actor?.profile_image ?? "",
        },
      });
      return;
    }

    if (notification.type === "missed_video_call" && notification.actor_id) {
      try {
        const conversation = await createDirectConversation(
          token,
          notification.actor_id,
        );
        router.push({
          pathname: "/chat/[id]",
          params: {
            id: conversation.id.toString(),
            userId: conversation.other_user?.id?.toString() ?? "",
            title:
              conversation.other_user?.name ??
              conversation.title ??
              "Неизвестен потребител",
            image:
              conversation.other_user?.profile_image ?? conversation.image ?? "",
          },
        });
      } catch (error) {
        Alert.alert(
          "Грешка",
          error instanceof Error
            ? error.message
            : "Разговорът не можа да бъде отворен.",
        );
      }
    }
  };

  const callBackFromNotification = async (notification: AppNotification) => {
    if (!token) return;

    const actorId =
      notification.actor_id ?? Number(notification.data?.caller_id);
    if (!Number.isInteger(actorId) || actorId <= 0) {
      Alert.alert("Грешка", "Обаждането не може да бъде върнато.");
      return;
    }

    if (isNotificationUnread(notification)) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );

      try {
        const updated = await markNotificationAsRead(token, notification.id);
        setNotifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } catch (error) {
        console.warn(
          "Известието не можа да бъде маркирано като прочетено:",
          error,
        );
      }
    }

    router.push({
      pathname: "/video-call/[userId]",
      params: {
        userId: String(actorId),
        name: notification.actor?.name ?? notification.title ?? "",
        autoStart: "1",
      },
    });
  };

  const handleDeleteNotification = async (notification: AppNotification) => {
    if (!token || deletingIdsRef.current.has(notification.id)) return;

    deletingIdsRef.current.add(notification.id);
    setNotifications((current) =>
      current.filter((item) => item.id !== notification.id),
    );

    try {
      await deleteNotification(token, notification.id);
    } catch (error) {
      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }

        return [...current, notification].sort((left, right) => right.id - left.id);
      });
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Известието не можа да бъде изтрито.",
      );
    } finally {
      deletingIdsRef.current.delete(notification.id);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;

    try {
      await markAllNotificationsAsRead(token);
      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true })),
      );
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Известията не можаха да бъдат маркирани като прочетени.",
      );
    }
  };

  const handleDeleteAll = () => {
    if (!token || notifications.length === 0) return;
    setIsDeleteAllVisible(true);
  };

  const confirmDeleteAll = async () => {
    if (!token) return;
    setIsDeleteAllVisible(false);

    try {
      await deleteAllNotifications(token);
      setNotifications([]);
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Известията не можаха да бъдат изтрити.",
      );
    }
  };

  const hasUnread = notifications.some((item) => isNotificationUnread(item));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Известия"
        hideSearchButton
        hideAuthButton
        actions={
          notifications.length > 0 ? (
            <>
              {hasUnread ? (
                <TouchableOpacity
                  onPress={() => void handleMarkAllRead()}
                  style={[
                    styles.headerAction,
                    { backgroundColor: theme.colors.background },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Маркирай всички като прочетени"
                >
                  <FontAwesome
                    name="envelope-open"
                    size={20}
                    color={theme.colors.icon}
                  />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={handleDeleteAll}
                style={[
                  styles.headerAction,
                  { backgroundColor: theme.colors.background },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Изтрий всички известия"
              >
                <FontAwesome name="trash" size={20} color={theme.colors.danger} />
              </TouchableOpacity>
            </>
          ) : null
        }
      />
      {isLoading ? (
        <InboxLoading />
      ) : (
        <FlatList
          data={notifications}
          extraData={notifications.map((item) => `${item.id}:${item.is_read}`).join("|")}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
              onPress={() => void openNotification(item)}
              onDelete={() => void handleDeleteNotification(item)}
              onCallBack={
                item.type === "missed_video_call"
                  ? () => void callBackFromNotification(item)
                  : undefined
              }
            />
          )}
          contentContainerStyle={[
            styles.listContainer,
            notifications.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={<NotificationsEmpty />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadNotifications("refresh")}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
        />
      )}
      <ConfirmModal
        visible={isDeleteAllVisible}
        title="Изтриване на известията"
        message="Сигурни ли сте, че искате да изтриете всички известия? Операцията не може да бъде отменена."
        confirmText="Изтрий всички"
        cancelText="Отказ"
        destructive
        onConfirm={() => void confirmDeleteAll()}
        onCancel={() => setIsDeleteAllVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { paddingVertical: 12 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  headerAction: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
});
