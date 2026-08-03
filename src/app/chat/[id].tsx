import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    FlatList,
    Image,
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
  const { theme } = useAppTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  // Взимаме ID от URL параметрите
  const { id } = useLocalSearchParams();

  // Намираме съответния потребител
  const user = MOCK_USERS.find((u) => u.id.toString() === id);

  const [inputMessage, setInputMessage] = useState("");
  // Демо списък със съобщения
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
          isDark ? styles.bgDark : styles.bgLight,
          styles.center,
        ]}
      >
        <Text style={isDark ? styles.textDark : styles.textLight}>
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
              ? styles.bubbleMe
              : isDark
                ? styles.bubbleThemDark
                : styles.bubbleThemLight,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMe
                ? styles.textWhite
                : isDark
                  ? styles.textDark
                  : styles.textLight,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMe
                ? styles.timeMe
                : isDark
                  ? styles.timeThemDark
                  : styles.timeThemLight,
            ]}
          >
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ЧАТ ХЕДЪР */}
      <View
        style={[
          styles.chatHeader,
          isDark ? styles.headerDark : styles.headerLight,
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <FontAwesome
            name="chevron-left"
            size={20}
            color={isDark ? "#ffffff" : "#09090b"}
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
              isDark ? styles.placeholderDark : styles.placeholderLight,
            ]}
          >
            <FontAwesome
              name="user"
              size={18}
              color={isDark ? "#a1a1aa" : "#71717a"}
            />
          </View>
        )}

        <View style={styles.headerTitleContainer}>
          <Text
            style={[
              styles.headerName,
              isDark ? styles.textDark : styles.textLight,
            ]}
          >
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
            color={isDark ? "#a1a1aa" : "#71717a"}
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
      />

      {/* ПОЛЕ ЗА ПИСАНЕ И ИЗПРАЩАНЕ */}
      <View
        style={[
          styles.inputContainer,
          isDark ? styles.inputDarkBg : styles.inputLightBg,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            isDark ? styles.inputTextDark : styles.inputTextLight,
          ]}
          placeholder="Напиши съобщение..."
          placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
          value={inputMessage}
          onChangeText={setInputMessage}
          multiline
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          style={[
            styles.sendButton,
            inputMessage.trim() ? styles.sendActive : styles.sendInactive,
          ]}
        >
          <FontAwesome name="send" size={18} color="#ffffff" />
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
  bgLight: {
    backgroundColor: "#f4f4f5", // Малко по-завесен фон за съобщенията в светъл режим
  },
  bgDark: {
    backgroundColor: "#09090b",
  },
  chatHeader: {
    paddingTop: 56,
    paddingBottom: 14,
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
  placeholderLight: {
    backgroundColor: "#f4f4f5",
  },
  placeholderDark: {
    backgroundColor: "#27272a",
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
    backgroundColor: "#3b82f6", // Хубаво чат синьо за нашите съобщения
    borderBottomRightRadius: 4,
  },
  bubbleThemLight: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 4,
  },
  bubbleThemDark: {
    backgroundColor: "#18181b",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textWhite: {
    color: "#ffffff",
  },
  textLight: {
    color: "#09090b",
  },
  textDark: {
    color: "#ffffff",
  },
  messageTime: {
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  timeMe: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  timeThemLight: {
    color: "#71717a",
  },
  timeThemDark: {
    color: "#a1a1aa",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12, // Допълнително пространство при iOS за "Home indicator"
    alignItems: "center",
  },
  inputLightBg: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
  },
  inputDarkBg: {
    backgroundColor: "#18181b",
    borderTopWidth: 1,
    borderTopColor: "#27272a",
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
  inputTextLight: {
    backgroundColor: "#f4f4f5",
    color: "#09090b",
  },
  inputTextDark: {
    backgroundColor: "#09090b",
    color: "#ffffff",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendActive: {
    backgroundColor: "#3b82f6",
  },
  sendInactive: {
    backgroundColor: "#94a3b8",
  },
});
