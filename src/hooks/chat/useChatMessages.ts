import { HttpError } from "@/services/session-http";
import {
  clearConversation,
  getConversation,
  getMessages,
  markConversationAsDelivered,
  markConversationAsRead,
  sendMessage,
  sendAttachment,
  toggleMessageReaction,
} from "@/services/chat";
import { playAppSound } from "@/services/sounds";
import type { ChatAttachmentUpload, ChatMessage, ChatUser } from "@/types/chat";
import {
  isMessageReactionType,
  type MessageReactionItem,
  type MessageReactionType,
} from "@/constants/message-reactions";
import type { ClearChatMessages, ClearChatScope } from "@/services/chat";
import type {
  ConversationClearedPayload,
  MessageReactionPayload,
  UserBlockPayload,
} from "@/services/socket";
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

type DeliveredReceipt = {
  conversation_id: number;
  last_delivered_message_id: number;
  delivered_at: string | null;
};

function applyReactionSummary(
  message: ChatMessage,
  items: Array<{ type: string; count: number }>,
  mine: MessageReactionType | null,
): ChatMessage {
  return {
    ...message,
    mine_reaction: mine,
    reactions: items
      .filter((item): item is MessageReactionItem => isMessageReactionType(item.type))
      .map((item) => ({
        type: item.type,
        count: item.count,
        reacted: item.type === mine,
      })),
  };
}

function toggleReactionLocally(
  message: ChatMessage,
  type: MessageReactionType,
): ChatMessage {
  const currentMine = message.mine_reaction ?? null;
  const nextMine = currentMine === type ? null : type;
  const counts = new Map<MessageReactionType, number>();

  for (const item of message.reactions ?? []) {
    if (item.count > 0) {
      counts.set(item.type, item.count);
    }
  }

  if (currentMine) {
    const nextCount = (counts.get(currentMine) ?? 1) - 1;
    if (nextCount > 0) {
      counts.set(currentMine, nextCount);
    } else {
      counts.delete(currentMine);
    }
  }

  if (nextMine) {
    counts.set(nextMine, (counts.get(nextMine) ?? 0) + 1);
  }

  return applyReactionSummary(
    message,
    [...counts.entries()].map(([reactionType, count]) => ({
      type: reactionType,
      count,
    })),
    nextMine,
  );
}

type UseChatMessagesParams = {
  token?: string | null;
  conversationId: number;
  currentUserId?: number | string;

  lastReceivedMessage?: ChatMessage | null;
  lastDeliveredReceipt?: DeliveredReceipt | null;
  lastReadReceipt?: ReadReceipt | null;
  lastReactionUpdate?: MessageReactionPayload | null;
  lastUserBlock?: UserBlockPayload | null;
  lastConversationCleared?: ConversationClearedPayload | null;
  otherUserId?: number | null;

  inputRef: RefObject<TextInput | null>;
  flatListRef: RefObject<FlatList<ChatMessage> | null>;

  isAppActive: boolean;
};

export function useChatMessages({
  token,
  conversationId,
  currentUserId,
  lastReceivedMessage,
  lastDeliveredReceipt,
  lastReadReceipt,
  lastReactionUpdate,
  lastUserBlock,
  lastConversationCleared,
  otherUserId,
  inputRef,
  flatListRef,
  isAppActive,
}: UseChatMessagesParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [shouldLeaveAfterClear, setShouldLeaveAfterClear] = useState(false);

  const lastReadReceiptRef = useRef(lastReadReceipt);
  const lastDeliveredReceiptRef = useRef(lastDeliveredReceipt);
  const isAppActiveRef = useRef(isAppActive);
  const isBlockedRef = useRef(false);

  useEffect(() => {
    lastReadReceiptRef.current = lastReadReceipt;
  }, [lastReadReceipt]);

  useEffect(() => {
    lastDeliveredReceiptRef.current = lastDeliveredReceipt;
  }, [lastDeliveredReceipt]);

  useEffect(() => {
    isAppActiveRef.current = isAppActive;
  }, [isAppActive]);

  useEffect(() => {
    isBlockedRef.current = isBlocked || blockedByOther;
  }, [isBlocked, blockedByOther]);

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
      setBlockedByOther(false);

      const lastMessage = response.data.at(-1);

      if (lastMessage) {
        void markConversationAsDelivered(token, conversationId, lastMessage.id);
      }

      if (
        isAppActiveRef.current &&
        lastMessage &&
        Number(lastMessage.sender_id) !== Number(currentUserId)
      ) {
        await markConversationAsRead(token, conversationId, lastMessage.id);
      }

    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        setBlockedByOther(true);
        setIsBlocked(true);
        return;
      }

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
    if (!lastUserBlock || currentUserId === undefined) {
      return;
    }

    const myId = Number(currentUserId);
    const otherId = Number(otherUser?.id ?? otherUserId);
    const involvesOther =
      Number.isInteger(otherId) &&
      otherId > 0 &&
      (Number(lastUserBlock.blocker_id) === otherId ||
        Number(lastUserBlock.blocked_id) === otherId);
    const involvesMe =
      Number(lastUserBlock.blocker_id) === myId ||
      Number(lastUserBlock.blocked_id) === myId;

    if (!involvesMe || !involvesOther) {
      return;
    }

    if (!lastUserBlock.blocked) {
      setIsBlocked(false);
      setBlockedByOther(false);
      return;
    }

    setIsBlocked(true);
    if (Number(lastUserBlock.blocked_id) === myId) {
      setBlockedByOther(true);
    }
  }, [lastUserBlock, currentUserId, otherUser?.id, otherUserId]);

  useEffect(() => {
    if (!lastConversationCleared || currentUserId === undefined) {
      return;
    }

    if (
      Number(lastConversationCleared.conversation_id) !== Number(conversationId)
    ) {
      return;
    }

    const myId = Number(currentUserId);
    if (
      lastConversationCleared.scope === "me" &&
      Number(lastConversationCleared.actor_id) !== myId
    ) {
      return;
    }

    if (lastConversationCleared.messages === "all") {
      setMessages([]);
      setShouldLeaveAfterClear(true);
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.filter(
        (message) =>
          Number(message.sender_id) !== Number(lastConversationCleared.actor_id),
      ),
    );
  }, [lastConversationCleared, conversationId, currentUserId]);

  useEffect(() => {
    if (
      !lastReceivedMessage ||
      Number(lastReceivedMessage.conversation_id) !== Number(conversationId) ||
      isBlockedRef.current
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

  useEffect(() => {
    if (
      !lastDeliveredReceipt ||
      Number(lastDeliveredReceipt.conversation_id) !== Number(conversationId)
    ) {
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) => {
        const shouldMarkAsDelivered =
          Number(message.sender_id) === Number(currentUserId) &&
          Number(message.id) <=
            Number(lastDeliveredReceipt.last_delivered_message_id) &&
          message.status !== "read" &&
          message.is_read !== true;

        if (!shouldMarkAsDelivered) {
          return message;
        }

        return {
          ...message,
          status: "delivered",
          delivered_at: lastDeliveredReceipt.delivered_at,
        };
      }),
    );
  }, [lastDeliveredReceipt, conversationId, currentUserId]);

  useEffect(() => {
    if (
      !lastReactionUpdate ||
      Number(lastReactionUpdate.conversation_id) !== Number(conversationId)
    ) {
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) => {
        if (Number(message.id) !== Number(lastReactionUpdate.message_id)) {
          return message;
        }

        const mine =
          Number(lastReactionUpdate.user_id) === Number(currentUserId)
            ? lastReactionUpdate.type &&
              isMessageReactionType(lastReactionUpdate.type)
              ? lastReactionUpdate.type
              : null
            : (message.mine_reaction ?? null);

        return applyReactionSummary(message, lastReactionUpdate.items, mine);
      }),
    );
  }, [lastReactionUpdate, conversationId, currentUserId]);

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
          const latestDeliveredReceipt = lastDeliveredReceiptRef.current;

          const wasAlreadyRead =
            Number(latestReadReceipt?.conversation_id) ===
              Number(conversationId) &&
            Number(message.id) <=
              Number(latestReadReceipt?.last_read_message_id);

          const wasAlreadyDelivered =
            Number(latestDeliveredReceipt?.conversation_id) ===
              Number(conversationId) &&
            Number(message.id) <=
              Number(latestDeliveredReceipt?.last_delivered_message_id);

          const normalizedMessage: ChatMessage =
            wasAlreadyRead && latestReadReceipt
              ? {
                  ...message,
                  status: "read",
                  is_read: true,
                  read_at: latestReadReceipt.read_at,
                }
              : wasAlreadyDelivered && latestDeliveredReceipt
                ? {
                    ...message,
                    status: "delivered",
                    delivered_at: latestDeliveredReceipt.delivered_at,
                  }
                : message;

          return [...currentMessages, normalizedMessage];
        });

        scrollToBottom();
        playAppSound("sendMessage");

        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });

        return true;
      } catch (error) {
        if (error instanceof HttpError && (error.status === 403 || error.status === 404)) {
          setIsBlocked(true);
          if (error.status === 404) {
            setBlockedByOther(true);
          }
          return false;
        }

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
        playAppSound("sendMessage");
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

  const reactToMessage = useCallback(
    async (messageId: number, type: MessageReactionType) => {
      if (!token || !Number.isInteger(conversationId)) {
        return;
      }

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          Number(message.id) === Number(messageId)
            ? toggleReactionLocally(message, type)
            : message,
        ),
      );

      try {
        const result = await toggleMessageReaction(
          token,
          conversationId,
          messageId,
          type,
        );

        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            Number(message.id) === Number(messageId)
              ? applyReactionSummary(
                  message,
                  result.reactions.items,
                  result.reactions.mine,
                )
              : message,
          ),
        );
      } catch (error) {
        Alert.alert(
          "Грешка",
          error instanceof Error
            ? error.message
            : "Реакцията не можа да бъде записана.",
        );
        void loadMessages();
      }
    },
    [token, conversationId, loadMessages],
  );

  const clearChat = useCallback(
    async (scope: ClearChatScope, messagesMode: ClearChatMessages) => {
      if (!token || !Number.isInteger(conversationId) || isClearing) {
        return false;
      }

      try {
        setIsClearing(true);
        const result = await clearConversation(
          token,
          conversationId,
          scope,
          messagesMode,
        );

        if (result.messages === "all") {
          setMessages([]);
          setShouldLeaveAfterClear(true);
        } else {
          setMessages((currentMessages) =>
            currentMessages.filter(
              (message) =>
                Number(message.sender_id) !== Number(currentUserId),
            ),
          );
        }

        return true;
      } catch (error) {
        Alert.alert(
          "Грешка",
          error instanceof Error
            ? error.message
            : "Чатът не можа да бъде изтрит.",
        );
        return false;
      } finally {
        setIsClearing(false);
      }
    },
    [token, conversationId, isClearing, currentUserId],
  );

  return {
    messages,
    otherUser,
    isBlocked,
    blockedByOther,
    isLoading,
    isSending,
    isUploading,
    isClearing,
    shouldLeaveAfterClear,

    loadMessages,
    sendChatMessage,
    sendChatAttachments,
    reactToMessage,
    clearChat,
    scrollToBottom,
  };
}
