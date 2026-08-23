import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import ConversationRow from "@/components/inbox/conversation-row";
import InboxEmpty from "@/components/inbox/inbox-empty";
import InboxLoading from "@/components/inbox/inbox-loading";
import UserSearch from "@/components/inbox/user-search";
import { useInboxPresence } from "@/hooks/chat/useInboxPresence";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { createDirectConversation, getConversations, markConversationAsDelivered } from "@/services/chat";
import type { ChatUser, Conversation } from "@/types/chat";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, View } from "react-native";

function conversationActivityAt(conversation: Conversation): number {
  const raw =
    conversation.last_message?.created_at ?? conversation.updated_at ?? "";
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : 0;
}

function sortConversations(items: Conversation[]): Conversation[] {
  return [...items].sort((left, right) => {
    const timeDiff = conversationActivityAt(right) - conversationActivityAt(left);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return Number(right.id) - Number(left.id);
  });
}

type LoadMode = "initial" | "refresh" | "silent";

export default function InboxScreen() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const { socket, isConnected, lastReceivedMessage, lastPresenceUpdate, lastPresenceStatus, lastUserBlock, lastConversationCleared } = useSocket();
  const unreadNotificationCount = useUnreadNotificationCount();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpeningConversation, setIsOpeningConversation] = useState(false);

  const loadConversations = useCallback(async (mode: LoadMode = "initial") => {
    if (!token) {
      setConversations([]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    try {
      if (mode === "refresh") setIsRefreshing(true);
      else if (mode === "initial") setIsLoading(true);
      const items = sortConversations(await getConversations(token));
      setConversations(items);

      void Promise.all(
        items.map((conversation) => {
          const lastMessage = conversation.last_message;
          if (
            !lastMessage ||
            Number(lastMessage.sender_id) === Number(user?.id) ||
            lastMessage.status !== "sent"
          ) {
            return Promise.resolve();
          }

          return markConversationAsDelivered(
            token,
            conversation.id,
            lastMessage.id,
          ).catch((error) => {
            console.error(
              "Съобщението не можа да бъде отбелязано като получено:",
              error,
            );
          });
        }),
      );
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Разговорите не можаха да бъдат заредени.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, user?.id]);

  const conversationUserIds = useMemo(() => conversations.map((conversation) => Number(conversation.other_user?.id)).filter((id) => Number.isInteger(id) && id > 0), [conversations]);
  const { isUserOnline } = useInboxPresence({ socket, isConnected, userIds: conversationUserIds, lastPresenceUpdate, lastPresenceStatus });

  useFocusEffect(useCallback(() => { void loadConversations("refresh"); }, [loadConversations]));

  useEffect(() => {
    if (!lastReceivedMessage) return;
    setConversations((currentConversations) => {
      const conversationIndex = currentConversations.findIndex((conversation) => Number(conversation.id) === Number(lastReceivedMessage.conversation_id));
      if (conversationIndex === -1) {
        void loadConversations("silent");
        return currentConversations;
      }
      const currentConversation = currentConversations[conversationIndex];
      const isIncoming = Number(lastReceivedMessage.sender_id) !== Number(user?.id);
      const updatedConversation: Conversation = {
        ...currentConversation,
        last_message: lastReceivedMessage,
        updated_at: lastReceivedMessage.created_at ?? currentConversation.updated_at,
        unread_count: isIncoming ? currentConversation.unread_count + 1 : currentConversation.unread_count,
      };
      return sortConversations([
        updatedConversation,
        ...currentConversations.filter((_, index) => index !== conversationIndex),
      ]);
    });
  }, [lastReceivedMessage, loadConversations, user?.id]);

  useEffect(() => {
    if (!lastUserBlock) {
      return;
    }

    const relatedIds = [
      Number(lastUserBlock.blocker_id),
      Number(lastUserBlock.blocked_id),
    ];

    if (lastUserBlock.blocked) {
      setConversations((current) =>
        current.filter((conversation) => {
          const otherId = Number(conversation.other_user?.id);
          return !relatedIds.includes(otherId);
        }),
      );
      return;
    }

    void loadConversations("silent");
  }, [lastUserBlock, loadConversations]);

  useEffect(() => {
    if (!lastConversationCleared) {
      return;
    }

    void loadConversations("silent");
  }, [lastConversationCleared, loadConversations]);

  const openCall = (conversation: Conversation) => {
    const otherUser = conversation.other_user;
    const recipientUserId = otherUser?.id;
    if (!recipientUserId || Number(recipientUserId) === Number(user?.id)) {
      return;
    }

    router.push({
      pathname: "/video-call/[userId]",
      params: {
        userId: String(recipientUserId),
        name: otherUser?.name ?? conversation.title ?? "Неизвестен потребител",
        image: otherUser?.profile_image ?? conversation.image ?? "",
        callType: "audio",
        autoStart: "1",
        conversationId: String(conversation.id),
      },
    });
  };

  const openConversation = (conversation: Conversation) => {
    const otherUser = conversation.other_user;
    router.push({ pathname: "/chat/[id]", params: { id: conversation.id.toString(), userId: otherUser?.id?.toString() ?? "", title: otherUser?.name ?? conversation.title ?? "Неизвестен потребител", image: otherUser?.profile_image ?? conversation.image ?? "" } });
  };

  const handleSelectUser = async (selectedUser: ChatUser) => {
    if (!token || isOpeningConversation) return;
    setIsOpeningConversation(true);
    try {
      openConversation(await createDirectConversation(token, selectedUser.id));
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Разговорът не можа да бъде отворен.");
    } finally {
      setIsOpeningConversation(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Входящи съобщения"
        hideSearchButton
        showNotificationsButton
        notificationCount={unreadNotificationCount}
      />
      <UserSearch token={token} onSelectUser={handleSelectUser} isSelecting={isOpeningConversation} />
      {isLoading ? <InboxLoading /> : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              isOnline={isUserOnline(item.other_user?.id)}
              onPress={() => openConversation(item)}
              onCall={item.other_user?.id ? () => openCall(item) : undefined}
            />
          )}
          contentContainerStyle={[styles.listContainer, conversations.length === 0 && styles.emptyList]}
          ListEmptyComponent={<InboxEmpty />}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadConversations("refresh")} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { paddingVertical: 12 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
});
