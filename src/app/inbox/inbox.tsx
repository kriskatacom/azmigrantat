import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import { MOCK_USERS, User } from "@/constants/users";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function InboxScreen() {
  const { theme } = useAppTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  const renderChatItem = ({ item }: { item: User }) => {
    const lastMessage = item.bio || `Здравей, пиши ми на ${item.email}`;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/chat/[id]",
            params: { id: item.id.toString() },
          })
        }
        style={[
          styles.chatRow,
          isDark ? styles.chatRowDark : styles.chatRowLight,
        ]}
      >
        <View style={styles.avatarContainer}>
          {item.profile_image ? (
            <Image source={{ uri: item.profile_image }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                isDark ? styles.placeholderDark : styles.placeholderLight,
              ]}
            >
              <FontAwesome
                name="user"
                size={26}
                color={isDark ? "#a1a1aa" : "#71717a"}
              />
            </View>
          )}

          <View
            style={[
              styles.statusIndicator,
              item.is_active ? styles.statusOnline : styles.statusOffline,
              isDark ? styles.borderDark : styles.borderLight,
            ]}
          />
        </View>

        <View style={styles.chatDetails}>
          <View style={styles.chatHeader}>
            <View style={styles.nameAndBadge}>
              <Text
                style={[
                  styles.profileName,
                  isDark ? styles.textDark : styles.textLight,
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </View>
            <Text
              style={[
                styles.timeText,
                isDark ? styles.subTextDark : styles.subTextLight,
              ]}
            >
              14:32
            </Text>
          </View>

          <Text
            style={[
              styles.messagePreview,
              isDark ? styles.subTextDark : styles.subTextLight,
            ]}
            numberOfLines={1}
          >
            {lastMessage}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}>
      <Header title="Входящи съобщения" />

      <FlatList
        data={MOCK_USERS}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderChatItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgLight: { backgroundColor: "#ffffff" },
  bgDark: { backgroundColor: "#09090b" },
  header: {
    paddingTop: 15,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerLight: {
    backgroundColor: "#ffffff",
    borderBottomColor: "#e4e4e7",
  },
  headerDark: {
    backgroundColor: "#18181b",
    borderBottomColor: "#27272a",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  listContainer: { paddingVertical: 12 },
  listTitle: {
    fontSize: 22,
    fontWeight: "600",
    paddingHorizontal: 20,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  chatRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  chatRowLight: { backgroundColor: "#ffffff" },
  chatRowDark: { backgroundColor: "#09090b" },
  avatarContainer: { position: "relative" },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderLight: { backgroundColor: "#f4f4f5" },
  placeholderDark: { backgroundColor: "#18181b" },
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 2.5,
  },
  borderLight: { borderColor: "#ffffff" },
  borderDark: { borderColor: "#09090b" },
  statusOnline: { backgroundColor: "#22c55e" },
  statusOffline: { backgroundColor: "#94a3b8" },
  chatDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
    borderBottomWidth: 0.5,
    paddingBottom: 14,
    borderBottomColor: "rgba(113, 113, 122, 0.15)",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameAndBadge: { flexDirection: "row", alignItems: "center", flex: 1 },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    marginRight: 6,
    maxWidth: "60%",
  },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  roleBadgeText: { fontSize: 10, fontWeight: "700" },
  timeText: { fontSize: 12 },
  messagePreview: { fontSize: 14, marginTop: 4, paddingRight: 10 },
  textLight: { color: "#09090b" },
  textDark: { color: "#ffffff" },
  subTextLight: { color: "#71717a" },
  subTextDark: { color: "#a1a1aa" },
});
