import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import ConversationRow from "@/components/inbox/conversation-row";
import InboxEmpty from "@/components/inbox/inbox-empty";
import InboxLoading from "@/components/inbox/inbox-loading";
import UserSearch from "@/components/inbox/user-search";
import { useAuth } from "@/hooks/useAuth";
import {
  createDirectConversation,
  getConversations,
  sendAttachment,
  sendMessage,
} from "@/services/chat";
import {
  findOversizedAttachment,
  getSharedAttachments,
  getSharedTextItems,
} from "@/services/incoming-share";
import type { ChatUser, Conversation } from "@/types/chat";
import { FontAwesome } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { Redirect, useRouter } from "expo-router";
import { useIncomingShare } from "expo-sharing";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ShareScreen() {
  const { theme } = useAppTheme();
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const {
    resolvedSharedPayloads,
    isResolving,
    error,
    clearSharedPayloads,
  } = useIncomingShare();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const attachments = useMemo(
    () => getSharedAttachments(resolvedSharedPayloads),
    [resolvedSharedPayloads],
  );
  const texts = useMemo(
    () => getSharedTextItems(resolvedSharedPayloads),
    [resolvedSharedPayloads],
  );
  const hasContent = attachments.length > 0 || texts.length > 0;

  const loadConversations = useCallback(async () => {
    if (!token) {
      setConversations([]);
      setIsLoadingConversations(false);
      return;
    }

    setIsLoadingConversations(true);
    try {
      setConversations(await getConversations(token));
    } catch (loadError) {
      Alert.alert(
        "Грешка",
        loadError instanceof Error
          ? loadError.message
          : "Разговорите не можаха да бъдат заредени.",
      );
    } finally {
      setIsLoadingConversations(false);
    }
  }, [token]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const handleCancel = () => {
    clearSharedPayloads();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  const openChat = (conversation: Conversation) => {
    const otherUser = conversation.other_user;
    router.replace({
      pathname: "/chat/[id]",
      params: {
        id: conversation.id.toString(),
        userId: otherUser?.id?.toString() ?? "",
        title: otherUser?.name ?? conversation.title ?? "Неизвестен потребител",
        image: otherUser?.profile_image ?? conversation.image ?? "",
      },
    });
  };

  const sendToConversation = async (conversation: Conversation) => {
    if (!token || isSending || !hasContent) {
      return;
    }

    const oversized = findOversizedAttachment(attachments);
    if (oversized) {
      Alert.alert(
        "Файлът е прекалено голям",
        `„${oversized.name}“ надвишава ограничението от 25 MB.`,
      );
      return;
    }

    setIsSending(true);
    try {
      for (const content of texts) {
        await sendMessage(token, conversation.id, {
          client_message_id: Crypto.randomUUID(),
          content,
        });
      }

      for (const attachment of attachments) {
        await sendAttachment(token, conversation.id, attachment);
      }

      clearSharedPayloads();
      openChat(conversation);
    } catch (sendError) {
      Alert.alert(
        "Неуспешно изпращане",
        sendError instanceof Error
          ? sendError.message
          : "Съдържанието не можа да бъде изпратено.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectUser = async (selectedUser: ChatUser) => {
    if (!token || isSending) {
      return;
    }

    try {
      const conversation = await createDirectConversation(token, selectedUser.id);
      await sendToConversation(conversation);
    } catch (createError) {
      Alert.alert(
        "Грешка",
        createError instanceof Error
          ? createError.message
          : "Разговорът не можа да бъде отворен.",
      );
    }
  };

  if (isAuthLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <InboxLoading />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Redirect
        href={{
          pathname: "/(auth)/login",
          params: { returnTo: "/share" },
        }}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Споделяне" hideSearchButton hideAuthButton />

      <View
        style={[
          styles.preview,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.previewTitle, { color: theme.colors.text }]}>
          Избери чат, към който да изпратиш
        </Text>
        {isResolving ? (
          <Text style={{ color: theme.colors.textSecondary }}>
            Зареждане на споделеното съдържание…
          </Text>
        ) : error ? (
          <Text style={{ color: theme.colors.danger }}>
            Споделеното съдържание не можа да бъде прочетено.
          </Text>
        ) : !hasContent ? (
          <Text style={{ color: theme.colors.textSecondary }}>
            Няма споделено съдържание за изпращане.
          </Text>
        ) : (
          <>
            {texts.map((text) => (
              <Text
                key={text}
                style={[styles.previewItem, { color: theme.colors.textSecondary }]}
                numberOfLines={2}
              >
                {text}
              </Text>
            ))}
            {attachments.map((attachment) => (
              <View key={`${attachment.uri}-${attachment.name}`} style={styles.fileRow}>
                <FontAwesome
                  name={
                    attachment.mimeType.startsWith("image/")
                      ? "image"
                      : attachment.mimeType.startsWith("audio/")
                        ? "music"
                        : "file-o"
                  }
                  size={16}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.previewItem, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {attachment.name}
                </Text>
              </View>
            ))}
          </>
        )}

        <TouchableOpacity onPress={handleCancel} disabled={isSending}>
          <Text style={[styles.cancel, { color: theme.colors.primary }]}>Отказ</Text>
        </TouchableOpacity>
      </View>

      <UserSearch
        token={token}
        onSelectUser={(user) => void handleSelectUser(user)}
        isSelecting={isSending}
      />

      {isLoadingConversations ? (
        <InboxLoading />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              isOnline={false}
              onPress={() => {
                if (!isSending) {
                  void sendToConversation(item);
                }
              }}
            />
          )}
          contentContainerStyle={[
            styles.listContainer,
            conversations.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={<InboxEmpty />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  preview: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  previewTitle: { fontSize: 16, fontWeight: "700" },
  previewItem: { fontSize: 14, flex: 1 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cancel: { fontSize: 15, fontWeight: "600", marginTop: 4 },
  listContainer: { paddingVertical: 12 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
});
