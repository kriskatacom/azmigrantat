import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { getConversations } from "@/services/chat";
import type { Conversation } from "@/types/chat";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function InboxScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadConversations = useCallback(
    async (refreshing = false) => {
      if (!token) {
        setConversations([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        if (refreshing) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const data = await getConversations(token);

        setConversations(data);
      } catch (error) {
        Alert.alert(
          "Грешка",
          error instanceof Error
            ? error.message
            : "Разговорите не можаха да бъдат заредени.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const handleRefresh = () => {
    void loadConversations(true);
  };

  const formatMessageTime = (date: string | null): string => {
    if (!date) {
      return "";
    }

    const messageDate = new Date(date);

    if (Number.isNaN(messageDate.getTime())) {
      return "";
    }

    const now = new Date();

    const isToday =
      messageDate.getFullYear() === now.getFullYear() &&
      messageDate.getMonth() === now.getMonth() &&
      messageDate.getDate() === now.getDate();

    if (isToday) {
      return messageDate.toLocaleTimeString("bg-BG", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return messageDate.toLocaleDateString("bg-BG", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const renderChatItem = ({ item }: { item: Conversation }) => {
    const otherUser = item.other_user;

    const displayName =
      otherUser?.name ?? item.title ?? "Неизвестен потребител";

    const profileImage = otherUser?.profile_image ?? item.image ?? null;

    const lastMessage = item.last_message?.content ?? "Все още няма съобщения.";

    const lastMessageTime = formatMessageTime(
      item.last_message?.created_at ?? item.updated_at,
    );

    const isActive = otherUser?.is_active ?? false;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/chat/[id]",
            params: {
              id: item.id.toString(),
              title: displayName,
              image: profileImage ?? "",
              isActive: isActive.toString(),
            },
          })
        }
        style={[
          styles.chatRow,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <View style={styles.avatarContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                {
                  backgroundColor: theme.colors.card,
                },
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
                backgroundColor: isActive
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
            {
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.chatHeader}>
            <View style={styles.nameAndBadge}>
              <Text
                style={[
                  styles.profileName,
                  {
                    color: theme.colors.text,
                  },
                ]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
            </View>

            <Text
              style={[
                styles.timeText,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              {lastMessageTime}
            </Text>
          </View>

          <Text
            style={[
              styles.messagePreview,
              {
                color: theme.colors.textSecondary,
              },
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
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Header title="Входящи съобщения" />

      {isLoading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />

          <Text
            style={{
              color: theme.colors.textSecondary,
              marginTop: 12,
            }}
          >
            Зареждане на разговорите...
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderChatItem}
          contentContainerStyle={[
            styles.listContainer,
            conversations.length === 0 && {
              flexGrow: 1,
              justifyContent: "center",
            },
          ]}
          ListEmptyComponent={
            <View
              style={{
                alignItems: "center",
                paddingHorizontal: 30,
              }}
            >
              <FontAwesome
                name="comments-o"
                size={48}
                color={theme.colors.textSecondary}
              />

              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 18,
                  fontWeight: "700",
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                Нямате разговори
              </Text>

              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 14,
                  lineHeight: 20,
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                Тук ще се показват потребителите, с които вече сте разменяли
                съобщения.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
