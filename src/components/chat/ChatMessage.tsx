import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { formatMessageTime } from "@/utils/chat/formatMessageTime";
import { StyleSheet, Text, View } from "react-native";

type ChatMessageProps = {
  message: ChatMessageType;
  isMe: boolean;

  colors: {
    button: string;
    buttonText: string;
    card: string;
    text: string;
    textSecondary: string;
  };
};

export default function ChatMessage({
  message,
  isMe,
  colors,
}: ChatMessageProps) {
  const isRead = message.is_read || message.status === "read";

  const formattedTime = formatMessageTime(message.created_at);

  return (
    <View style={[styles.messageRow, isMe ? styles.rowMe : styles.rowThem]}>
      <View
        style={[
          styles.bubble,
          isMe
            ? [
                styles.bubbleMe,
                {
                  backgroundColor: colors.button,
                },
              ]
            : [
                styles.bubbleThem,
                {
                  backgroundColor: colors.card,
                },
              ],
        ]}
      >
        <Text
          style={[
            styles.messageText,
            {
              color: isMe ? colors.buttonText : colors.text,
            },
          ]}
        >
          {message.content}
        </Text>

        <View style={styles.messageMeta}>
          <Text
            style={[
              styles.messageTime,
              {
                color: isMe ? "rgba(255, 255, 255, 0.7)" : colors.textSecondary,
              },
            ]}
          >
            {formattedTime}
          </Text>

          {isMe && (
            <Text
              style={[
                styles.readIndicator,
                {
                  color: isRead ? "#60a5fa" : "rgba(255, 255, 255, 0.7)",
                },
              ]}
            >
              {isRead ? "✓✓" : "✓"}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },

  messageTime: {
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },

  readIndicator: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },
});
