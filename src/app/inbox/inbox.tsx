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
        style={[styles.chatRow, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.avatarContainer}>
          {item.profile_image ? (
            <Image source={{ uri: item.profile_image }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: theme.colors.card },
              ]}
            >
              <FontAwesome
                name="user"
                size={26}
                color={theme.colors.textSecondary}
              />
            </View>
          )}

          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor: item.is_active
                  ? theme.colors.primary
                  : theme.colors.textSecondary,
                borderColor: theme.colors.background,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.chatDetails,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          <View style={styles.chatHeader}>
            <View style={styles.nameAndBadge}>
              <Text
                style={[styles.profileName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </View>

            <Text
              style={[styles.timeText, { color: theme.colors.textSecondary }]}
            >
              14:32
            </Text>
          </View>

          <Text
            style={[
              styles.messagePreview,
              { color: theme.colors.textSecondary },
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
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header title="Входящи съобщения" />

      <FlatList
        data={MOCK_USERS}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderChatItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 12,
  },
  chatRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 2.5,
  },
  chatDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
    borderBottomWidth: 0.5,
    paddingBottom: 14,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameAndBadge: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    marginRight: 6,
    maxWidth: "60%",
  },
  timeText: {
    fontSize: 12,
  },
  messagePreview: {
    fontSize: 14,
    marginTop: 4,
    paddingRight: 10,
  },
});
