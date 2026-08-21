import {
  getConversation,
  getMessages,
  markConversationAsRead,
  sendMessage,
  sendAttachment,
} from "@/services/chat";
import type { ChatAttachmentUpload, ChatMessage, ChatUser } from "@/types/chat";
import * as Crypto from "expo-crypto";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, FlatList, TextInput } from "react-native";

type ReadReceipt = {
  conversation_id: number;
  last_read_message_id: number;
  read_at: string | null;
};

type UseChatMessagesParams = {
  token?: string | null;
  conversationId: number;
  currentUserId?: number | string;

  lastReceivedMessage?: ChatMessage | null;
  lastReadReceipt?: ReadReceipt | null;

  inputRef: RefObject<TextInput | null>;
  flatListRef: RefObject<FlatList<ChatMessage> | null>;

  isAppActive: boolean;
};

export function useChatMessages({
  token,
  conversationId,
  currentUserId,
  lastReceivedMessage,
  lastReadReceipt,
  inputRef,
  flatListRef,
  isAppActive,
}: UseChatMessagesParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const lastReadReceiptRef = useRef(lastReadReceipt);
  const isAppActiveRef = useRef(isAppActive);

  useEffect(() => {
    lastReadReceiptRef.current = lastReadReceipt;
  }, [lastReadReceipt]);

  useEffect(() => {
    isAppActiveRef.current = isAppActive;
  }, [isAppActive]);

  const resolveOtherUser = useCallback(
    (items: ChatMessage[]) => {
      if (currentUserId === undefined) {
        return;
      }

      const otherMessage = items.find(
        (message) =>
          Number(message.sender_id) !== Number(currentUserId) &&
          message.sender !== null,
      );

      if (otherMessage?.sender) {
        setOtherUser(otherMessage.sender);
      }
    },
    [currentUserId],
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({
        offset: 0,
        animated: true,
      });
    });
  }, [flatListRef]);

  const loadMessages = useCallback(async () => {
    if (!token || !Number.isInteger(conversationId)) {
      return;
    }

    try {
      setIsLoading(true);

      const [response, conversation] = await Promise.all([
        getMessages(token, conversationId, {
          limit: 50,
        }),
        getConversation(token, conversationId).catch(() => null),
      ]);

      setMessages(response.data);
      if (conversation?.other_user) {
        setOtherUser(conversation.other_user);
      } else {
        resolveOtherUser(response.data);
      }
      setIsBlocked(conversation?.is_blocked === true);

      const lastMessage = response.data.at(-1);

      if (
        isAppActiveRef.current &&
        lastMessage &&
        Number(lastMessage.sender_id) !== Number(currentUserId)
      ) {
        await markConversationAsRead(token, conversationId, lastMessage.id);
      }

    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Съобщенията не можаха да бъдат заредени.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    token,
    conversationId,
    currentUserId,
    resolveOtherUser,
  ]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (
      !lastReceivedMessage ||
      Number(lastReceivedMessage.conversation_id) !== Number(conversationId)
    ) {
      return;
    }

    setMessages((currentMessages) => {
      const alreadyExists = currentMessages.some(
        (message) => Number(message.id) === Number(lastReceivedMessage.id),
      );

      if (alreadyExists) {
        return currentMessages;
      }

      return [...currentMessages, lastReceivedMessage];
    });

    if (
      token &&
      isAppActive &&
      Number(lastReceivedMessage.sender_id) !== Number(currentUserId)
    ) {
      void markConversationAsRead(
        token,
        conversationId,
        lastReceivedMessage.id,
      );
    }

    scrollToBottom();
  }, [
    lastReceivedMessage,
    conversationId,
    token,
    currentUserId,
    scrollToBottom,
    isAppActive,
  ]);

  useEffect(() => {
    if (
      !lastReadReceipt ||
      Number(lastReadReceipt.conversation_id) !== Number(conversationId)
    ) {
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) => {
        const shouldMarkAsRead =
          Number(message.sender_id) === Number(currentUserId) &&
          Number(message.id) <= Number(lastReadReceipt.last_read_message_id);

        if (!shouldMarkAsRead) {
          return message;
        }

        return {
          ...message,
          status: "read",
          is_read: true,
          read_at: lastReadReceipt.read_at,
        };
      }),
    );
  }, [lastReadReceipt, conversationId, currentUserId]);

  const sendChatMessage = useCallback(
    async (content: string) => {
      const normalizedContent = content.trim();

      if (
        !normalizedContent ||
        !token ||
        !Number.isInteger(conversationId) ||
        isSending
      ) {
        return false;
      }

      try {
        setIsSending(true);

        const message = await sendMessage(token, conversationId, {
          client_message_id: Crypto.randomUUID(),
          content: normalizedContent,
        });

        setMessages((currentMessages) => {
          const alreadyExists = currentMessages.some(
            (currentMessage) =>
              Number(currentMessage.id) === Number(message.id),
          );

          if (alreadyExists) {
            return currentMessages;
          }

          const latestReadReceipt = lastReadReceiptRef.current;

          const wasAlreadyRead =
            Number(latestReadReceipt?.conversation_id) ===
              Number(conversationId) &&
            Number(message.id) <=
              Number(latestReadReceipt?.last_read_message_id);

          const normalizedMessage: ChatMessage =
            wasAlreadyRead && latestReadReceipt
              ? {
                  ...message,
                  status: "read",
                  is_read: true,
                  read_at: latestReadReceipt.read_at,
                }
              : message;

          return [...currentMessages, normalizedMessage];
        });

        scrollToBottom();

        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });

        return true;
      } catch (error) {
        Alert.alert(
          "Неуспешно изпращане",
          error instanceof Error
            ? error.message
            : "Съобщението не можа да бъде изпратено.",
        );

        return false;
      } finally {
        setIsSending(false);
      }
    },
    [token, conversationId, isSending, scrollToBottom, inputRef],
  );

  const sendChatAttachments = useCallback(
    async (attachments: ChatAttachmentUpload[]) => {
      if (!token || !Number.isInteger(conversationId) || isUploading || attachments.length === 0) return false;

      try {
        setIsUploading(true);
        for (const attachment of attachments) {
          const message = await sendAttachment(token, conversationId, attachment);
          setMessages((currentMessages) =>
            currentMessages.some((item) => Number(item.id) === Number(message.id))
              ? currentMessages
              : [...currentMessages, message],
          );
        }
        scrollToBottom();
        return true;
      } catch (error) {
        Alert.alert(
          "Неуспешно изпращане",
          error instanceof Error ? error.message : "Файлът не можа да бъде изпратен.",
        );
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [token, conversationId, isUploading, scrollToBottom],
  );

  return {
    messages,
    otherUser,
    isBlocked,
    isLoading,
    isSending,
    isUploading,

    loadMessages,
    sendChatMessage,
    sendChatAttachments,
    scrollToBottom,
  };
}
