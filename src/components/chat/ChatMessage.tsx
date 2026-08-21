import { useUserSettings } from "@/hooks/useUserSettings";
import { getChatFontMetrics } from "@/services/user-settings";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { formatMessageTime } from "@/utils/chat/formatMessageTime";
import { getFirstMessageUrl } from "@/utils/chat/message-links";
import { StyleSheet, Text, View } from "react-native";
import LinkifiedMessageText from "./LinkifiedMessageText";
import LinkPreviewCard from "./LinkPreviewCard";
import MessageAttachment, { getMessageAttachment } from "./MessageAttachment";

type ChatMessageProps = {
  message: ChatMessageType;
  isMe: boolean;
  token?: string | null;

  colors: {
    button: string;
    buttonText: string;
    card: string;
    border: string;
    text: string;
    textSecondary: string;
    primary: string;
  };
};

export default function ChatMessage({
  message,
  isMe,
  colors,
  token,
}: ChatMessageProps) {
  const { chatFontSize } = useUserSettings();
  const fonts = getChatFontMetrics(chatFontSize);
  const isRead = message.is_read || message.status === "read";

  const formattedTime = formatMessageTime(message.created_at);
  const previewUrl = getFirstMessageUrl(message.content);
  const attachment = getMessageAttachment(message);

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
        {attachment ? <MessageAttachment message={message} isMe={isMe} colors={colors} /> : null}

        {message.content && !attachment ? (
          <LinkifiedMessageText
            content={message.content}
            color={isMe ? colors.buttonText : colors.text}
            linkColor={isMe ? "#dbeafe" : colors.primary}
            style={[
              styles.messageText,
              { fontSize: fonts.message, lineHeight: fonts.messageLineHeight },
            ]}
          />
        ) : null}

        {previewUrl && !attachment ? (
          <LinkPreviewCard token={token} url={previewUrl} colors={colors} isMe={isMe} />
        ) : null}

        <View style={styles.messageMeta}>
          <Text
            style={[
              styles.messageTime,
              {
                color: isMe ? "rgba(255, 255, 255, 0.7)" : colors.textSecondary,
                fontSize: fonts.time,
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
