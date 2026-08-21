import { useUserSettings } from "@/hooks/useUserSettings";
import { getChatFontMetrics } from "@/services/user-settings";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import type { MessageReactionType } from "@/constants/message-reactions";
import { formatMessageTime } from "@/utils/chat/formatMessageTime";
import { getFirstMessageUrl } from "@/utils/chat/message-links";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ChatCallEvent, { parseCallEvent } from "./ChatCallEvent";
import ChatMessageReactions from "./ChatMessageReactions";
import LinkifiedMessageText from "./LinkifiedMessageText";
import LinkPreviewCard from "./LinkPreviewCard";
import MessageAttachment, { getMessageAttachment } from "./MessageAttachment";

type ChatMessageProps = {
  message: ChatMessageType;
  isMe: boolean;
  currentUserId?: number | string;
  token?: string | null;
  canReact?: boolean;
  onReact?: (type: MessageReactionType) => void;
  onOpenReactions?: () => void;

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
  currentUserId,
  colors,
  token,
  canReact = false,
  onReact,
  onOpenReactions,
}: ChatMessageProps) {
  const { chatFontSize } = useUserSettings();
  const fonts = getChatFontMetrics(chatFontSize);
  const callEvent = parseCallEvent(message);

  if (callEvent) {
    return (
      <ChatCallEvent
        event={callEvent}
        currentUserId={currentUserId}
        colors={colors}
      />
    );
  }

  const isRead = message.is_read === true || message.status === "read";
  const isDelivered =
    !isRead &&
    (message.status === "delivered" || message.delivered_at != null);

  const formattedTime = formatMessageTime(message.created_at);
  const previewUrl = getFirstMessageUrl(message.content);
  const attachment = getMessageAttachment(message);
  const reactions = message.reactions ?? [];
  const canShowReactions = message.type !== "system";

  return (
    <View style={[styles.messageRow, isMe ? styles.rowMe : styles.rowThem]}>
      <View style={[styles.column, isMe ? styles.columnMe : styles.columnThem]}>
        <Pressable
          delayLongPress={320}
          disabled={!canReact || !canShowReactions}
          onLongPress={canReact && canShowReactions ? onOpenReactions : undefined}
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
          {attachment ? (
            <MessageAttachment message={message} isMe={isMe} colors={colors} />
          ) : null}

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
            <LinkPreviewCard
              token={token}
              url={previewUrl}
              colors={colors}
              isMe={isMe}
            />
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
                accessibilityLabel={
                  isRead ? "Прочетено" : isDelivered ? "Получено" : "Изпратено"
                }
              >
                {isRead || isDelivered ? "✓✓" : "✓"}
              </Text>
            )}
          </View>
        </Pressable>

        {canShowReactions && onReact ? (
          <ChatMessageReactions
            reactions={reactions}
            align={isMe ? "right" : "left"}
            onPress={onReact}
            colors={colors}
          />
        ) : null}
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

  column: {
    maxWidth: "75%",
  },

  columnMe: {
    alignItems: "flex-end",
  },

  columnThem: {
    alignItems: "flex-start",
  },

  bubble: {
    maxWidth: "100%",
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
