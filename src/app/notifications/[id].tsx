import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import InboxLoading from "@/components/inbox/inbox-loading";
import { formatInboxMessageTime } from "@/components/inbox/format-inbox-message-time";
import { useAuth } from "@/hooks/useAuth";
import { createDirectConversation } from "@/services/chat";
import {
  deleteNotification,
  getNotification,
  markNotificationAsRead,
} from "@/services/notifications-api";
import type { AppNotification } from "@/types/notifications";
import {
  getMissedCallActorId,
  isNotificationUnread,
} from "@/types/notifications";
import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RemoteImage from "@/components/ui/RemoteImage";

function formatNotificationDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationDetailScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const notificationId = useMemo(() => {
    const raw = Array.isArray(params.id) ? params.id[0] : params.id;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
  }, [params.id]);

  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const loadNotification = useCallback(async () => {
    if (!token || !Number.isInteger(notificationId)) {
      setNotification(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const loaded = await getNotification(token, notificationId);
      setNotification(loaded);

      if (isNotificationUnread(loaded)) {
        const updated = await markNotificationAsRead(token, loaded.id);
        setNotification(updated);
      }
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Известието не можа да бъде заредено.",
        [{ text: "Назад", onPress: () => router.back() }],
      );
    } finally {
      setIsLoading(false);
    }
  }, [notificationId, router, token]);

  useEffect(() => {
    void loadNotification();
  }, [loadNotification]);

  const actorId = notification ? getMissedCallActorId(notification) : null;
  const displayName =
    notification?.actor?.name ?? notification?.title ?? "Известие";
  const typeLabel =
    notification?.type === "missed_video_call"
      ? "Пропуснато обаждане"
      : notification?.type === "message_reaction"
        ? "Реакция"
        : "Известие";
  const createdLabel = formatNotificationDate(
    notification?.created_at ?? null,
  );
  const updatedLabel = formatInboxMessageTime(
    notification?.updated_at ?? notification?.created_at ?? null,
  );

  const handleCallBack = async () => {
    if (!token || !notification || !actorId) return;

    router.push({
      pathname: "/video-call/[userId]",
      params: {
        userId: String(actorId),
        name: displayName,
        image: notification.actor?.profile_image ?? "",
        autoStart: "1",
      },
    });
  };

  const handleOpenChat = async () => {
    if (!token || !notification) return;

    const conversationId = Number(notification.data?.conversation_id);
    if (Number.isInteger(conversationId) && conversationId > 0) {
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: String(conversationId),
          userId: notification.actor_id ? String(notification.actor_id) : "",
          title: displayName,
          image: notification.actor?.profile_image ?? "",
        },
      });
      return;
    }

    if (!notification.actor_id) {
      Alert.alert("Грешка", "Разговорът не може да бъде отворен.");
      return;
    }

    setIsBusy(true);
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
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = () => {
    if (!token || !notification) return;

    Alert.alert(
      "Изтриване",
      "Сигурни ли сте, че искате да изтриете това известие?",
      [
        { text: "Отказ", style: "cancel" },
        {
          text: "Изтрий",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setIsBusy(true);
              try {
                await deleteNotification(token, notification.id);
                router.back();
              } catch (error) {
                Alert.alert(
                  "Грешка",
                  error instanceof Error
                    ? error.message
                    : "Известието не можа да бъде изтрито.",
                );
              } finally {
                setIsBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Известие" hideSearchButton hideAuthButton />
      {isLoading ? (
        <InboxLoading />
      ) : notification ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.identity}>
            {notification.actor?.profile_image ? (
              <RemoteImage
                uri={notification.actor.profile_image}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <FontAwesome
                  name={
                    notification.type === "missed_video_call"
                      ? "phone"
                      : notification.type === "message_reaction"
                        ? "heart"
                        : "bell"
                  }
                  size={32}
                  color="#ffffff"
                />
              </View>
            )}
            <Text style={[styles.name, { color: theme.colors.text }]}>
              {displayName}
            </Text>
            <Text style={[styles.type, { color: theme.colors.primary }]}>
              {typeLabel}
            </Text>
            {updatedLabel ? (
              <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                {createdLabel || updatedLabel}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.message, { color: theme.colors.text }]}>
              {notification.message ?? "Няма допълнително съдържание."}
            </Text>
            {notification.count > 1 ? (
              <Text
                style={[styles.count, { color: theme.colors.textSecondary }]}
              >
                {notification.type === "message_reaction"
                  ? `Групирани реакции: ${notification.count}`
                  : `Групирани обаждания: ${notification.count}`}
              </Text>
            ) : null}
          </View>

          {actorId ? (
            <TouchableOpacity
              disabled={isBusy}
              onPress={() => void handleCallBack()}
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Върни обаждането"
            >
              <FontAwesome name="phone" size={18} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Върни обаждането</Text>
            </TouchableOpacity>
          ) : null}

          {notification.actor_id || Number(notification.data?.conversation_id) > 0 ? (
            <TouchableOpacity
              disabled={isBusy}
              onPress={() => void handleOpenChat()}
              style={[
                styles.secondaryButton,
                { borderColor: theme.colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Отвори чата"
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
                Отвори чата
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            disabled={isBusy}
            onPress={handleDelete}
            style={styles.deleteButton}
            accessibilityRole="button"
            accessibilityLabel="Изтрий известието"
          >
            <Text style={[styles.deleteButtonText, { color: theme.colors.danger }]}>
              Изтрий известието
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 16,
  },
  identity: { alignItems: "center", gap: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  type: { fontSize: 14, fontWeight: "700" },
  time: { fontSize: 13 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  message: { fontSize: 16, lineHeight: 24 },
  count: { fontSize: 13 },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { fontSize: 16, fontWeight: "700" },
  deleteButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: { fontSize: 15, fontWeight: "700" },
});
