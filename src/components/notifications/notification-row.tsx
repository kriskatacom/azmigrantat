import { useAppTheme } from "@/app/_layout";
import type { AppNotification } from "@/types/notifications";
import { getMissedCallActorId, isNotificationUnread } from "@/types/notifications";
import { formatInboxMessageTime } from "@/components/inbox/format-inbox-message-time";
import { FontAwesome } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

interface NotificationRowProps {
  notification: AppNotification;
  onPress: () => void;
  onDelete: () => void;
  onCallBack?: () => void;
}

export default function NotificationRow({
  notification,
  onPress,
  onDelete,
  onCallBack,
}: NotificationRowProps) {
  const { theme } = useAppTheme();
  const actor = notification.actor;
  const displayName = actor?.name ?? notification.title ?? "Известие";
  const profileImage = actor?.profile_image ?? null;
  const preview = notification.message ?? "";
  const unread = isNotificationUnread(notification);
  const canCallBack = getMissedCallActorId(notification) !== null;
  const time = formatInboxMessageTime(
    notification.updated_at ?? notification.created_at,
  );

  const renderDeleteAction = () => (
    <TouchableOpacity
      onPress={onDelete}
      style={[styles.deleteAction, { backgroundColor: theme.colors.danger }]}
      accessibilityRole="button"
      accessibilityLabel="Изтрий известието"
    >
      <FontAwesome name="trash" size={22} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <Swipeable
      friction={2}
      overshootFriction={8}
      renderLeftActions={renderDeleteAction}
      renderRightActions={renderDeleteAction}
      onSwipeableOpen={onDelete}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.row, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.avatarContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                {
                  backgroundColor:
                    notification.type === "missed_video_call"
                      ? theme.colors.primary
                      : notification.type === "message_reaction"
                        ? "#fb7185"
                        : theme.colors.card,
                },
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
                size={22}
                color={
                  notification.type === "missed_video_call"
                    ? "#ffffff"
                    : notification.type === "message_reaction"
                      ? "#ffffff"
                      : theme.colors.textSecondary
                }
              />
            </View>
          )}
        </View>
        <View
          style={[styles.details, { borderBottomColor: theme.colors.border }]}
        >
          <View style={styles.header}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.name,
                  {
                    color: theme.colors.text,
                    fontWeight: unread ? "800" : "600",
                  },
                ]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
            </View>
            <View style={styles.meta}>
              {unread ? (
                <View
                  style={[
                    styles.unreadDot,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              ) : null}
              <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                {time}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.preview, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {preview}
          </Text>
        </View>
        {canCallBack && onCallBack ? (
          <TouchableOpacity
            onPress={onCallBack}
            style={[
              styles.callButton,
              { backgroundColor: theme.colors.primary },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Върни обаждането"
          >
            <FontAwesome name="phone" size={18} color="#ffffff" />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  avatarContainer: { position: "relative" },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  details: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
    borderBottomWidth: 0.5,
    paddingBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameRow: { flex: 1, marginRight: 6 },
  name: { fontSize: 16 },
  meta: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  time: { fontSize: 12 },
  preview: { fontSize: 14, marginTop: 4, paddingRight: 10 },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  deleteAction: {
    width: 88,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "stretch",
  },
});
