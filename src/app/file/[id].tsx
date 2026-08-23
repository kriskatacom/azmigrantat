import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import AudioMessagePlayer from "@/components/chat/audio-message-player";
import AppButton from "@/components/ui/AppButton";
import RemoteImage from "@/components/ui/RemoteImage";
import { useAuth } from "@/hooks/useAuth";
import { useSaveChatImage } from "@/hooks/chat/useSaveChatImage";
import { getConversationMessage } from "@/services/chat";
import type { ChatMessage } from "@/types/chat";
import {
  fileExtension,
  formatFileSize,
  getMessageAttachment,
  isAudioAttachment,
  isImageAttachment,
  mimeTypeLabel,
} from "@/utils/chat/attachment";
import { formatChatDateLabel, formatMessageTime } from "@/utils/chat/formatMessageTime";
import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function FileDetailsScreen() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{
    id?: string | string[];
    conversationId?: string | string[];
  }>();

  const messageId = Number(firstParam(params.id));
  const conversationId = Number(firstParam(params.conversationId));
  const [message, setMessage] = useState<ChatMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMessage = useCallback(async () => {
    if (
      !token ||
      !Number.isInteger(messageId) ||
      messageId <= 0 ||
      !Number.isInteger(conversationId) ||
      conversationId <= 0
    ) {
      setMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setMessage(await getConversationMessage(token, conversationId, messageId));
    } catch (error) {
      setMessage(null);
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Детайлите на файла не можаха да бъдат заредени.",
        [{ text: "Назад", onPress: () => router.back() }],
      );
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, messageId, router, token]);

  useEffect(() => {
    void loadMessage();
  }, [loadMessage]);

  const attachment = message ? getMessageAttachment(message) : null;
  const isImage = message
    ? isImageAttachment(message.type, attachment?.mimeType ?? null)
    : false;
  const isAudio = message
    ? isAudioAttachment(message.type, attachment?.mimeType ?? null)
    : false;
  const isMe = Boolean(user && message && message.sender_id === user.id);
  const {
    isSaving,
    downloadFile,
    saveToGallery,
  } = useSaveChatImage({
    messageId: message?.id ?? 0,
    url: attachment?.url ?? "",
    name: attachment?.name ?? "file",
    mimeType: attachment?.mimeType ?? null,
  });

  const sentAt = useMemo(() => {
    if (!message?.created_at) {
      return null;
    }

    const dateLabel = formatChatDateLabel(message.created_at);
    const timeLabel = formatMessageTime(message.created_at);
    return [dateLabel, timeLabel].filter(Boolean).join(", ");
  }, [message?.created_at]);

  const previewWidth = Math.min(width - 40, 520);
  const sizeLabel = formatFileSize(attachment?.size ?? null);
  const extension = attachment ? fileExtension(attachment.name) : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title="Детайли на файла" hideSearchButton hideAuthButton />
      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : !message || !attachment ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Файлът не е наличен.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.previewCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            {isImage ? (
              <RemoteImage
                uri={attachment.url}
                style={[styles.previewImage, { width: previewWidth }]}
                contentFit="contain"
              />
            ) : isAudio ? (
              <View style={styles.audioPreview}>
                <FontAwesome name="volume-up" size={36} color={theme.colors.primary} />
                <AudioMessagePlayer
                  url={attachment.url}
                  isMe={false}
                  colors={theme.colors}
                />
              </View>
            ) : (
              <View style={styles.filePreview}>
                <View
                  style={[
                    styles.fileIcon,
                    { backgroundColor: `${theme.colors.primary}1a` },
                  ]}
                >
                  <FontAwesome
                    name="file-o"
                    size={36}
                    color={theme.colors.primary}
                  />
                </View>
                <Text
                  selectable
                  style={[styles.previewName, { color: theme.colors.text }]}
                >
                  {attachment.name}
                </Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.detailsCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.fileTitle, { color: theme.colors.text }]} selectable>
              {attachment.name}
            </Text>
            <DetailRow
              label="Тип"
              value={mimeTypeLabel(attachment.mimeType, message.type)}
              colors={theme.colors}
            />
            {extension ? (
              <DetailRow label="Разширение" value={`.${extension}`} colors={theme.colors} />
            ) : null}
            {sizeLabel ? (
              <DetailRow label="Размер" value={sizeLabel} colors={theme.colors} />
            ) : null}
            {attachment.mimeType ? (
              <DetailRow
                label="Формат"
                value={attachment.mimeType}
                colors={theme.colors}
              />
            ) : null}
            <DetailRow
              label="Изпратен от"
              value={isMe ? "Вас" : message.sender?.name || "Неизвестен"}
              colors={theme.colors}
            />
            {sentAt ? (
              <DetailRow label="Дата" value={sentAt} colors={theme.colors} />
            ) : null}
          </View>

          <AppButton
            title="Свали или запази"
            loading={isSaving}
            onPress={() => void downloadFile()}
          />
          {isImage ? (
            <AppButton
              title="Запази в галерията"
              loading={isSaving}
              onPress={() => void saveToGallery()}
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string; textSecondary: string; border: string };
}) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text selectable style={[styles.rowValue, { color: colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 15, textAlign: "center" },
  previewCard: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    paddingVertical: 16,
  },
  previewImage: {
    minHeight: 220,
    maxHeight: 420,
    height: 320,
    backgroundColor: "rgba(127,127,127,0.08)",
  },
  audioPreview: {
    width: "100%",
    paddingHorizontal: 16,
    gap: 16,
    alignItems: "center",
  },
  filePreview: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  fileIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  previewName: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  detailsCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  fileTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  rowLabel: { fontSize: 12, fontWeight: "600" },
  rowValue: { fontSize: 15, lineHeight: 20 },
});
