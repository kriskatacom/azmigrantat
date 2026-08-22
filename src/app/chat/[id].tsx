import { useAppTheme } from "@/app/_layout";

import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessageList from "@/components/chat/ChatMessageList";
import ChatClearChatModal, {
  type ClearChatMessages,
  type ClearChatScope,
} from "@/components/chat/chat-clear-chat-modal";
import ConfirmModal from "@/components/ui/ConfirmModal";

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
  const videoNavigationLockedRef = useRef(false);
  const videoNavigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (videoNavigationTimerRef.current) {
        clearTimeout(videoNavigationTimerRef.current);
      }
    };
  }, []);

  const {
    socket,
    isConnected,
    lastReceivedMessage,
    lastDeliveredReceipt,
    lastReadReceipt,
    lastReactionUpdate,
    lastTypingUpdate,
    lastPresenceUpdate,
    lastPresenceStatus,
    lastUserBlock,
    lastConversationCleared,
  } = useSocket();

  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const inputRef = useRef<TextInput>(null);

  const params = useLocalSearchParams<{
    id?: string | string[];
    userId?: string | string[];
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

  const routeUserId = useMemo(() => {
    const rawUserId = Array.isArray(params.userId)
      ? params.userId[0]
      : params.userId;
    const parsedUserId = rawUserId ? Number(rawUserId) : NaN;
    return Number.isInteger(parsedUserId) && parsedUserId > 0
      ? parsedUserId
      : null;
  }, [params.userId]);

  const [inputMessage, setInputMessage] = useState("");

  const [clearMenuVisible, setClearMenuVisible] = useState(false);
  const [pendingClear, setPendingClear] = useState<{
    scope: ClearChatScope;
    messages: ClearChatMessages;
  } | null>(null);

  const { keyboardVisible } = useChatKeyboard();

  const {
    messages,
    otherUser,
    isBlocked,
    blockedByOther,
    isLoading,
    isSending,
    isUploading,
    isClearing,
    shouldLeaveAfterClear,
    sendChatMessage,
    sendChatAttachments,
    reactToMessage,
    clearChat,
    scrollToBottom,
  } = useChatMessages({
    token,
    conversationId,
    currentUserId: user?.id,
    lastReceivedMessage,
    lastDeliveredReceipt,
    lastReadReceipt,
    lastReactionUpdate,
    lastUserBlock,
    lastConversationCleared,
    otherUserId: routeUserId,
    inputRef,
    flatListRef,
    isAppActive,
  });

  const { takePhoto, choosePhotos, chooseFiles } = useChatAttachments({
    disabled: isSending || isUploading || isBlocked,
    onSend: sendChatAttachments,
  });

  const { isOtherUserTyping, handleTyping, stopTyping } = useChatTyping({
    socket,
    conversationId,
    currentUserId: user?.id,
    otherUserId: isBlocked ? undefined : otherUser?.id ?? routeUserId,
    lastTypingUpdate,
  });

  const { isOtherUserOnline, lastSeenAt } = useChatPresence({
    socket,
    isConnected,
    otherUserId: isBlocked ? undefined : otherUser?.id ?? routeUserId,
    lastPresenceUpdate,
    lastPresenceStatus,
  });

  useEffect(() => {
    if (!blockedByOther) {
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/inbox");
  }, [blockedByOther, router]);

  useEffect(() => {
    if (!shouldLeaveAfterClear) {
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/inbox");
  }, [shouldLeaveAfterClear, router]);

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

  const displayedName = blockedByOther
    ? "Потребител"
    : (otherUser?.name ?? routeTitle ?? "Разговор");

  const displayedImage = blockedByOther
    ? null
    : (otherUser?.profile_image ?? routeImage ?? null);

  const recipientUserId = otherUser?.id ?? routeUserId;

  const openCall = (callType: "audio" | "video") => {
    if (
      videoNavigationLockedRef.current ||
      !recipientUserId ||
      Number(recipientUserId) === Number(user?.id)
    ) return;

    videoNavigationLockedRef.current = true;
    videoNavigationTimerRef.current = setTimeout(() => {
      videoNavigationLockedRef.current = false;
      videoNavigationTimerRef.current = null;
    }, 1_000);

    router.push({
      pathname: "/video-call/[userId]",
      params: {
        userId: String(recipientUserId),
        name: displayedName,
        image: displayedImage ?? "",
        callType,
        autoStart: "1",
      },
    });
  };

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
        isOnline={!isBlocked && isOtherUserOnline}
        lastSeenAt={isBlocked ? null : lastSeenAt}
        isTyping={!isBlocked && isOtherUserTyping}
        publicCode={isBlocked ? undefined : otherUser?.public_code}
        onBack={() => router.back()}
        onAudioCall={
          !isBlocked && recipientUserId ? () => openCall("audio") : undefined
        }
        onVideoCall={
          !isBlocked && recipientUserId ? () => openCall("video") : undefined
        }
        onMorePress={() => setClearMenuVisible(true)}
        colors={theme.colors}
      />

      <ChatMessageList
        messages={messages}
        token={token}
        currentUserId={user?.id}
        isLoading={isLoading}
        canReact={!isBlocked}
        onReact={(messageId, type) => {
          void reactToMessage(messageId, type);
        }}
        listRef={flatListRef}
        colors={theme.colors}
      />

      {isBlocked ? (
        <View
          style={[
            styles.blockedBanner,
            {
              backgroundColor: theme.colors.card,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.blockedText, { color: theme.colors.textSecondary }]}>
            Този потребител е блокиран. Съобщения и обаждания не са възможни.
          </Text>
        </View>
      ) : (
        <ChatInput
          value={inputMessage}
          isSending={isSending || isUploading}
          keyboardVisible={keyboardVisible}
          inputRef={inputRef}
          onChangeText={handleInputChange}
          onTakePhoto={() => void takePhoto()}
          onChoosePhotos={() => void choosePhotos()}
          onChooseFiles={() => void chooseFiles()}
          onSendAudio={sendChatAttachments}
          onSend={() => {
            void handleSendMessage();
          }}
          colors={theme.colors}
        />
      )}

      <ChatClearChatModal
        visible={clearMenuVisible}
        busy={isClearing}
        onClose={() => setClearMenuVisible(false)}
        onConfirm={(scope, messagesMode) => {
          setClearMenuVisible(false);
          setPendingClear({ scope, messages: messagesMode });
        }}
        colors={theme.colors}
      />

      <ConfirmModal
        visible={pendingClear !== null}
        title={
          pendingClear?.scope === "both"
            ? "Изтриване за двамата"
            : "Изтриване само за мен"
        }
        message={
          pendingClear?.messages === "all"
            ? pendingClear.scope === "both"
              ? "Всички съобщения ще бъдат изтрити и за двамата. Това не може да се отмени."
              : "Цялата история ще се скрие само за вас. Другият ще продължи да я вижда."
            : pendingClear?.scope === "both"
              ? "Вашите съобщения ще бъдат изтрити и за другия човек."
              : "Само вашите съобщения ще се скрият за вас."
        }
        confirmText="Изтрий"
        cancelText="Отказ"
        destructive
        onCancel={() => {
          if (!isClearing) {
            setPendingClear(null);
          }
        }}
        onConfirm={() => {
          if (!pendingClear) {
            return;
          }

          void clearChat(pendingClear.scope, pendingClear.messages).then(
            (ok) => {
              if (ok) {
                setPendingClear(null);
              }
            },
          );
        }}
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
  blockedBanner: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  blockedText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
