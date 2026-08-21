import type { MessageReactionType } from "@/constants/message-reactions";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import {
  formatChatDateLabel,
  getMessageDayKey,
} from "@/utils/chat/formatMessageTime";
import { useMemo, useState, type RefObject } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ChatDateSeparator from "./ChatDateSeparator";
import ChatMessage from "./ChatMessage";
import ChatReactionPicker from "./ChatReactionPicker";

type ChatMessageListProps = {
  messages: ChatMessageType[];
  currentUserId?: number | string;
  token?: string | null;
  isLoading: boolean;
  canReact?: boolean;
  onReact?: (messageId: number, type: MessageReactionType) => void;
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
  canReact = false,
  onReact,
  listRef,
  colors,
  token,
}: ChatMessageListProps) {
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const [pickerMessage, setPickerMessage] = useState<ChatMessageType | null>(
    null,
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={invertedMessages}
        inverted
        extraData={messages}
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
                currentUserId={currentUserId}
                colors={colors}
                token={token}
                canReact={canReact}
                onReact={
                  onReact ? (type) => onReact(item.id, type) : undefined
                }
                onOpenReactions={() => setPickerMessage(item)}
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

      <ChatReactionPicker
        visible={pickerMessage !== null}
        selectedType={pickerMessage?.mine_reaction ?? null}
        onClose={() => setPickerMessage(null)}
        onSelect={(type) => {
          if (pickerMessage && onReact) {
            onReact(pickerMessage.id, type);
          }
          setPickerMessage(null);
        }}
        colors={colors}
      />
    </View>
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
