import { useAppTheme } from "@/app/_layout";
import { useAuth } from "@/hooks/useAuth";
import {
  getMessages,
  markConversationAsRead,
  sendMessage,
} from "@/services/chat";
import type { ChatMessage, ChatUser } from "@/types/chat";
import { FontAwesome } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatRoom() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const params = useLocalSearchParams<{
    id?: string | string[];
    title?: string | string[];
    image?: string | string[];
    isActive?: string | string[];
  }>();

  const conversationId = useMemo(() => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    return rawId ? Number(rawId) : NaN;
  }, [params.id]);

  const routeTitle = Array.isArray(params.title)
    ? params.title[0]
    : params.title;

  const routeImage = Array.isArray(params.image)
    ? params.image[0]
    : params.image;

  const routeIsActive = Array.isArray(params.isActive)
    ? params.isActive[0]
    : params.isActive;

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const resolveOtherUser = useCallback(
    (items: ChatMessage[]) => {
      if (!user) {
        return;
      }

      const otherMessage = items.find(
        (message) => message.sender_id !== user.id && message.sender !== null,
      );

      if (otherMessage?.sender) {
        setOtherUser(otherMessage.sender);
      }
    },
    [user],
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({
        animated: true,
      });
    });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!token || !Number.isInteger(conversationId)) {
      return;
    }

    try {
      setIsLoading(true);

      const response = await getMessages(token, conversationId, {
        limit: 50,
      });

      setMessages(response.data);
      resolveOtherUser(response.data);

      const lastMessage = response.data.at(-1);

      if (lastMessage && lastMessage.sender_id !== user?.id) {
        await markConversationAsRead(token, conversationId, lastMessage.id);
      }

      scrollToBottom();
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Съобщенията не можаха да бъдат заредени.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, conversationId, user?.id, resolveOtherUser, scrollToBottom]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
      scrollToBottom();
    });

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollToBottom]);

  const handleSendMessage = async () => {
    const content = inputMessage.trim();

    if (!content || !token || !Number.isInteger(conversationId) || isSending) {
      return;
    }

    setInputMessage("");

    try {
      setIsSending(true);

      const message = await sendMessage(token, conversationId, {
        client_message_id: Crypto.randomUUID(),
        content,
      });

      setMessages((currentMessages) => {
        const alreadyExists = currentMessages.some(
          (currentMessage) => currentMessage.id === message.id,
        );

        if (alreadyExists) {
          return currentMessages;
        }

        return [...currentMessages, message];
      });

      scrollToBottom();
    } catch (error) {
      setInputMessage(content);

      Alert.alert(
        "Неуспешно изпращане",
        error instanceof Error
          ? error.message
          : "Съобщението не можа да бъде изпратено.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_id === user?.id;

    return (
      <View style={[styles.messageRow, isMe ? styles.rowMe : styles.rowThem]}>
        <View
          style={[
            styles.bubble,
            isMe
              ? [styles.bubbleMe, { backgroundColor: theme.colors.button }]
              : [styles.bubbleThem, { backgroundColor: theme.colors.card }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              {
                color: isMe ? theme.colors.buttonText : theme.colors.text,
              },
            ]}
          >
            {item.content}
          </Text>

          <Text
            style={[
              styles.messageTime,
              {
                color: isMe
                  ? "rgba(255, 255, 255, 0.7)"
                  : theme.colors.textSecondary,
              },
            ]}
          >
            {item.created_at
              ? new Date(item.created_at).toLocaleTimeString("bg-BG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </Text>
        </View>
      </View>
    );
  };

  if (!Number.isInteger(conversationId)) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={{ color: theme.colors.text }}>
          Разговорът не е намерен.
        </Text>
      </View>
    );
  }

  const displayedName = otherUser?.name ?? routeTitle ?? "Разговор";

  const displayedImage = otherUser?.profile_image ?? routeImage ?? null;

  const isUserActive = otherUser?.is_active ?? routeIsActive === "true";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.chatHeader,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Назад"
        >
          <FontAwesome
            name="chevron-left"
            size={20}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        {displayedImage ? (
          <Image source={{ uri: displayedImage }} style={styles.headerAvatar} />
        ) : (
          <View
            style={[
              styles.headerAvatarPlaceholder,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <FontAwesome
              name="user"
              size={18}
              color={theme.colors.textSecondary}
            />
          </View>
        )}

        <View style={styles.headerTitleContainer}>
          <Text
            style={[styles.headerName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {displayedName}
          </Text>

          <Text
            style={[
              styles.headerStatus,
              isUserActive ? styles.statusOnline : styles.statusOffline,
            ]}
          >
            {isUserActive ? "на линия" : "неактивен"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.infoButton}
          accessibilityRole="button"
          accessibilityLabel="Информация за разговора"
        >
          <FontAwesome
            name="info-circle"
            size={24}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessageItem}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.center,
          ]}
          ListEmptyComponent={
            <Text
              style={{
                color: theme.colors.textSecondary,
                textAlign: "center",
              }}
            >
              Все още няма съобщения.
            </Text>
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          onContentSizeChange={scrollToBottom}
        />
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
            paddingBottom:
              Platform.OS === "ios" ? 28 : keyboardVisible ? 8 : 60,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
            },
          ]}
          placeholder="Напиши съобщение..."
          placeholderTextColor={theme.colors.placeholder}
          value={inputMessage}
          onChangeText={setInputMessage}
          multiline
          maxLength={10000}
          editable={!isSending}
        />

        <TouchableOpacity
          onPress={() => void handleSendMessage()}
          disabled={!inputMessage.trim() || isSending}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                inputMessage.trim() && !isSending
                  ? theme.colors.button
                  : theme.colors.textSecondary,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Изпрати съобщението"
        >
          {isSending ? (
            <ActivityIndicator size="small" color={theme.colors.buttonText} />
          ) : (
            <FontAwesome
              name="send"
              size={18}
              color={theme.colors.buttonText}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  chatHeader: {
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  statusOnline: {
    color: "#22c55e",
  },
  statusOffline: {
    color: "#71717a",
  },
  infoButton: {
    padding: 8,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 12,
    width: "100%",
  },
  rowMe: {
    justifyContent: "flex-end",
  },
  rowThem: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    borderTopWidth: 1,
    alignItems: "center",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
