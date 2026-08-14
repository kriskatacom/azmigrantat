import { useAppTheme } from "@/app/_layout";

import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessageList from "@/components/chat/ChatMessageList";

import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";

import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import { useChatAttachments } from "@/hooks/chat/useChatAttachments";
import { useChatMessages } from "@/hooks/chat/useChatMessages";
import { useChatTyping } from "@/hooks/chat/useChatTyping";

import { setActiveConversationId } from "@/services/notificationState";

import type { ChatMessage } from "@/types/chat";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useChatPresence } from "@/hooks/chat/useChatPresence";
import { useAppActive } from "@/hooks/useAppActive";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ChatRoom() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const isAppActive = useAppActive();

  const router = useRouter();

  const {
    socket,
    isConnected,
    lastReceivedMessage,
    lastReadReceipt,
    lastTypingUpdate,
    lastPresenceUpdate,
    lastPresenceStatus,
  } = useSocket();

  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const inputRef = useRef<TextInput>(null);

  const params = useLocalSearchParams<{
    id?: string | string[];
    title?: string | string[];
    image?: string | string[];
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

  const [inputMessage, setInputMessage] = useState("");

  const { keyboardVisible } = useChatKeyboard();

  const {
    messages,
    otherUser,
    isLoading,
    isSending,
    isUploading,
    sendChatMessage,
    sendChatAttachments,
    scrollToBottom,
  } = useChatMessages({
    token,
    conversationId,
    currentUserId: user?.id,
    lastReceivedMessage,
    lastReadReceipt,
    inputRef,
    flatListRef,
    isAppActive,
  });

  const { openAttachmentMenu } = useChatAttachments({
    disabled: isSending || isUploading,
    onSend: sendChatAttachments,
  });

  const { isOtherUserTyping, handleTyping, stopTyping } = useChatTyping({
    socket,
    conversationId,
    currentUserId: user?.id,
    otherUserId: otherUser?.id,
    lastTypingUpdate,
  });

  const { isOtherUserOnline, lastSeenAt } = useChatPresence({
    socket,
    isConnected,
    otherUserId: otherUser?.id,
    lastPresenceUpdate,
    lastPresenceStatus,
  });

  useEffect(() => {
    if (!Number.isInteger(conversationId) || !isAppActive) {
      setActiveConversationId(null);
      return;
    }

    setActiveConversationId(conversationId);

    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId, isAppActive]);

  useEffect(() => {
    if (!keyboardVisible) {
      return;
    }

    const timeout = setTimeout(() => {
      scrollToBottom();
    }, 150);

    return () => {
      clearTimeout(timeout);
    };
  }, [keyboardVisible, scrollToBottom]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputMessage(value);

      handleTyping(value);
    },
    [handleTyping],
  );

  const handleSendMessage = useCallback(async () => {
    const content = inputMessage.trim();

    if (!content || isSending) {
      return;
    }

    stopTyping();
    setInputMessage("");

    const sent = await sendChatMessage(content);

    if (!sent) {
      setInputMessage(content);
    }
  }, [inputMessage, isSending, stopTyping, sendChatMessage]);

  if (!Number.isInteger(conversationId)) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <Text
          style={{
            color: theme.colors.text,
          }}
        >
          Разговорът не е намерен.
        </Text>
      </View>
    );
  }

  const displayedName = otherUser?.name ?? routeTitle ?? "Разговор";

  const displayedImage = otherUser?.profile_image ?? routeImage ?? null;

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ChatHeader
        name={displayedName}
        image={displayedImage}
        isOnline={isOtherUserOnline}
        lastSeenAt={lastSeenAt}
        isTyping={isOtherUserTyping}
        onBack={() => router.back()}
        colors={theme.colors}
      />

      <ChatMessageList
        messages={messages}
        token={token}
        currentUserId={user?.id}
        isLoading={isLoading}
        listRef={flatListRef}
        onContentSizeChange={scrollToBottom}
        colors={theme.colors}
      />

      <ChatInput
        value={inputMessage}
        isSending={isSending || isUploading}
        keyboardVisible={keyboardVisible}
        inputRef={inputRef}
        onChangeText={handleInputChange}
        onAttach={openAttachmentMenu}
        onSend={() => {
          void handleSendMessage();
        }}
        colors={theme.colors}
      />
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
});
