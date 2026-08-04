import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
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
import { MOCK_USERS } from "../../constants/users";
import { useAppTheme } from "../_layout";

interface Message {
  id: number;
  text: string;
  sender: "me" | "them";
  time: string;
}

export default function ChatRoom() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { theme } = useAppTheme();
  const router = useRouter();

  const { id } = useLocalSearchParams();

  const user = MOCK_USERS.find((u) => u.id.toString() === id);

  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Здравей! Как върви работата по проекта?",
      sender: "them",
      time: "14:28",
    },
    {
      id: 2,
      text: "Здрасти! Всичко е супер, пиша в момента кода на React Native.",
      sender: "me",
      time: "14:29",
    },
    {
      id: 3,
      text: "Супер! Дано не ти дава грешки с нативните библиотеки.",
      sender: "them",
      time: "14:30",
    },
    {
      id: 4,
      text: "Хаха, оправих го! Вече всичко работи перфектно без допълнителни библиотеки. 🔥",
      sender: "me",
      time: "14:31",
    },
  ]);

  if (!user) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={{ color: theme.colors.text }}>
          Потребителят не е намерен.
        </Text>
      </View>
    );
  }

  const handleSendMessage = () => {
    if (inputMessage.trim() === "") return;

    const newMessage: Message = {
      id: messages.length + 1,
      text: inputMessage,
      sender: "me",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, newMessage]);
    setInputMessage("");
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMe = item.sender === "me";
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
            {item.text}
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
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      {/* ЧАТ ХЕДЪР */}
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
        >
          <FontAwesome
            name="chevron-left"
            size={20}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        {user.profile_image ? (
          <Image
            source={{ uri: user.profile_image }}
            style={styles.headerAvatar}
          />
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
          <Text style={[styles.headerName, { color: theme.colors.text }]}>
            {user.name}
          </Text>
          <Text
            style={[
              styles.headerStatus,
              user.is_active ? styles.statusOnline : styles.statusOffline,
            ]}
          >
            {user.is_active ? "на линия" : "неактивен"}
          </Text>
        </View>

        <TouchableOpacity style={styles.infoButton}>
          <FontAwesome
            name="info-circle"
            size={24}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* СПИСЪК СЪС СЪОБЩЕНИЯ */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      />

      {/* ПОЛЕ ЗА ПИСАНЕ И ИЗПРАЩАНЕ */}
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
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          style={[
            styles.sendButton,
            {
              backgroundColor: inputMessage.trim()
                ? theme.colors.button
                : theme.colors.textSecondary,
            },
          ]}
        >
          <FontAwesome name="send" size={18} color={theme.colors.buttonText} />
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
