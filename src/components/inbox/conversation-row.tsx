import { useAppTheme } from "@/app/_layout";
import type { Conversation } from "@/types/chat";
import { formatInboxMessageTime } from "@/components/inbox/format-inbox-message-time";
import { FontAwesome } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ConversationRowProps {
  conversation: Conversation;
  isOnline: boolean;
  onPress: () => void;
}

export default function ConversationRow({ conversation, isOnline, onPress }: ConversationRowProps) {
  const { theme } = useAppTheme();
  const otherUser = conversation.other_user;
  const displayName = otherUser?.name ?? conversation.title ?? "Неизвестен потребител";
  const profileImage = otherUser?.profile_image ?? conversation.image ?? null;
  const lastMessage = conversation.last_message?.content ?? "Все още няма съобщения.";
  const lastMessageTime = formatInboxMessageTime(conversation.last_message?.created_at ?? conversation.updated_at);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.row, { backgroundColor: theme.colors.background }]}>
      <View style={styles.avatarContainer}>
        {profileImage ? <Image source={{ uri: profileImage }} style={styles.avatar} /> : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.card }]}>
            <FontAwesome name="user" size={26} color={theme.colors.textSecondary} />
          </View>
        )}
        <View style={[styles.status, { backgroundColor: isOnline ? "#22c55e" : theme.colors.textSecondary, borderColor: theme.colors.background }]} />
      </View>
      <View style={[styles.details, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.header}>
          <View style={styles.nameAndBadge}>
            <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{displayName}</Text>
            {conversation.unread_count > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.badgeText, { color: theme.colors.buttonText }]}>{conversation.unread_count > 99 ? "99+" : conversation.unread_count}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{lastMessageTime}</Text>
        </View>
        <Text style={[styles.preview, { color: theme.colors.textSecondary }]} numberOfLines={1}>{lastMessage}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 14, alignItems: "center" },
  avatarContainer: { position: "relative" },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarPlaceholder: { width: 58, height: 58, borderRadius: 29, justifyContent: "center", alignItems: "center" },
  status: { position: "absolute", bottom: 0, right: 0, width: 15, height: 15, borderRadius: 7.5, borderWidth: 2.5 },
  details: { flex: 1, marginLeft: 14, justifyContent: "center", borderBottomWidth: 0.5, paddingBottom: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nameAndBadge: { flexDirection: "row", alignItems: "center", flex: 1 },
  name: { fontSize: 16, fontWeight: "700", marginRight: 6, maxWidth: "60%" },
  time: { fontSize: 12 },
  preview: { fontSize: 14, marginTop: 4, paddingRight: 10 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", marginLeft: 6 },
  badgeText: { fontSize: 11, fontWeight: "800" },
});
