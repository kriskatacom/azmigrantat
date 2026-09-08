import { type AppSocket, type TypingPayload } from "@/services/socket";

import { useCallback, useEffect, useRef, useState } from "react";

type UseChatTypingParams = {
  socket: AppSocket | null;
  conversationId: number;
  currentUserId?: number | string;
  otherUserId?: number | string;
  lastTypingUpdate: TypingPayload | null;
};

export function useChatTyping({
  socket,
  conversationId,
  currentUserId,
  otherUserId,
  lastTypingUpdate,
}: UseChatTypingParams) {
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getPayload = useCallback(() => {
    if (!otherUserId || !Number.isInteger(conversationId)) {
      return null;
    }

    return {
      conversation_id: conversationId,
      recipient_ids: [Number(otherUserId)],
    };
  }, [conversationId, otherUserId]);

  const clearTypingTimeout = useCallback(() => {
    if (!typingTimeoutRef.current) {
      return;
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
  }, []);

  const stopTyping = useCallback(() => {
    clearTypingTimeout();

    if (!socket?.connected) {
      return;
    }

    const payload = getPayload();

    if (!payload) {
      return;
    }

    socket.emit("typing:stop", payload);
  }, [socket, getPayload, clearTypingTimeout]);

  const handleTyping = useCallback(
    (value: string) => {
      clearTypingTimeout();

      if (!socket?.connected) {
        return;
      }

      const payload = getPayload();

      if (!payload) {
        return;
      }

      if (!value.trim()) {
        socket.emit("typing:stop", payload);
        return;
      }

      socket.emit("typing:start", payload);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing:stop", payload);

        typingTimeoutRef.current = null;
      }, 3000);
    },
    [socket, getPayload, clearTypingTimeout],
  );

  useEffect(() => {
    if (
      !lastTypingUpdate ||
      Number(lastTypingUpdate.conversation_id) !== Number(conversationId) ||
      Number(lastTypingUpdate.user_id) === Number(currentUserId)
    ) {
      return;
    }

    setIsOtherUserTyping(lastTypingUpdate.is_typing);
  }, [lastTypingUpdate, conversationId, currentUserId]);

  useEffect(() => {
    return () => {
      clearTypingTimeout();

      if (!socket?.connected) {
        return;
      }

      const payload = getPayload();

      if (!payload) {
        return;
      }

      socket.emit("typing:stop", payload);
    };
  }, [socket, getPayload, clearTypingTimeout]);

  return {
    isOtherUserTyping,
    handleTyping,
    stopTyping,
  };
}
