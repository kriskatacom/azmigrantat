import type { ChatMessage as ChatMessageType } from "@/types/chat";
import type { RefObject } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from "react-native";

import ChatMessage from "./ChatMessage";

type ChatMessageListProps = {
  messages: ChatMessageType[];
  currentUserId?: number | string;
  isLoading: boolean;
  listRef: RefObject<FlatList<ChatMessageType> | null>;
  onContentSizeChange: () => void;

  colors: {
    button: string;
    buttonText: string;
    card: string;
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
  onContentSizeChange,
  colors,
}: ChatMessageListProps) {
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
      data={messages}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <ChatMessage
          message={item}
          isMe={Number(item.sender_id) === Number(currentUserId)}
          colors={colors}
        />
      )}
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
      onContentSizeChange={onContentSizeChange}
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
