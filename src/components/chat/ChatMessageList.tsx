import type { ChatMessage as ChatMessageType } from "@/types/chat";
import {
  formatChatDateLabel,
  getMessageDayKey,
} from "@/utils/chat/formatMessageTime";
import { useMemo, type RefObject } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from "react-native";

import ChatDateSeparator from "./ChatDateSeparator";
import ChatMessage from "./ChatMessage";

type ChatMessageListProps = {
  messages: ChatMessageType[];
  currentUserId?: number | string;
  token?: string | null;
  isLoading: boolean;
  listRef: RefObject<FlatList<ChatMessageType> | null>;

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

export default function ChatMessageList({
  messages,
  currentUserId,
  isLoading,
  listRef,
  colors,
  token,
}: ChatMessageListProps) {
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={invertedMessages}
      inverted
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item, index }) => {
        const olderMessage = invertedMessages[index + 1];
        const showDateSeparator =
          getMessageDayKey(item.created_at) !==
          getMessageDayKey(olderMessage?.created_at);

        return (
          <View>
            <ChatMessage
              message={item}
              isMe={Number(item.sender_id) === Number(currentUserId)}
              colors={colors}
              token={token}
            />
            {showDateSeparator ? (
              <ChatDateSeparator
                label={formatChatDateLabel(item.created_at)}
                textColor={colors.textSecondary}
                backgroundColor={colors.card}
              />
            ) : null}
          </View>
        );
      }}
      contentContainerStyle={[
        styles.messagesList,
        messages.length === 0 && styles.center,
      ]}
      ListEmptyComponent={
        <Text
          style={{
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          Все още няма съобщения.
        </Text>
      }
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
    />
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

  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
});
