import { useSaveChatImage } from "@/hooks/chat/useSaveChatImage";
import type { ChatMessage } from "@/types/chat";
import { FontAwesome } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AudioMessagePlayer from "./audio-message-player";
import ChatDownloadOptionsModal from "./chat-download-options-modal";

interface AttachmentData {
  url: string;
  name: string;
  mimeType: string | null;
  size: number | null;
}

function metadataString(
  metadata: Record<string, unknown> | null,
  keys: string[],
) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

export function getMessageAttachment(
  message: ChatMessage,
): AttachmentData | null {
  if (
    message.type !== "image" &&
    message.type !== "audio" &&
    message.type !== "file"
  )
    return null;
  const url =
    metadataString(message.metadata, ["url", "file_url", "download_url"]) ??
    (message.content?.startsWith("http") ? message.content : null);
  if (!url) return null;

  return {
    url,
    name:
      metadataString(message.metadata, [
        "name",
        "original_name",
        "file_name",
      ]) ??
      decodeURIComponent(
        url.split("/").at(-1)?.split("?")[0] ||
          (message.type === "image" ? "Снимка" : "Файл"),
      ),
    mimeType: metadataString(message.metadata, ["mime_type", "mimeType"]),
    size:
      typeof message.metadata?.size === "number" ? message.metadata.size : null,
  };
}

function formatFileSize(size: number | null) {
  if (!size) return null;
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

interface MessageAttachmentProps {
  message: ChatMessage;
  isMe: boolean;
  colors: {
    card: string;
    border: string;
    text: string;
    textSecondary: string;
    primary: string;
  };
}

export default function MessageAttachment({
  message,
  isMe,
  colors,
}: MessageAttachmentProps) {
  const { width, height } = useWindowDimensions();

  const attachmentWidth = Math.min(Math.max(width * 0.72, 210), 320);

  const imageHeight = Math.min(Math.max(height * 0.24, 160), 240);

  const actionButtonSize = Math.min(Math.max(width * 0.09, 34), 40);

  const actionButtonRadius = actionButtonSize / 2;

  const attachment = getMessageAttachment(message);
  const isImage =
    message.type === "image" ||
    attachment?.mimeType?.startsWith("image/") === true;
  const isAudio =
    message.type === "audio" ||
    attachment?.mimeType?.startsWith("audio/") === true;
  const {
    isSaving,
    isSaveMenuVisible,
    openSaveMenu,
    closeSaveMenu,
    downloadFile,
    saveToGallery,
  } = useSaveChatImage({
    messageId: message.id,
    url: attachment?.url ?? "",
    name: attachment?.name ?? "image.jpg",
    mimeType: attachment?.mimeType ?? null,
  });
  if (!attachment) return null;

  const downloadModal = (
    <ChatDownloadOptionsModal
      visible={isSaveMenuVisible}
      isImage={isImage}
      fileName={attachment.name}
      onClose={closeSaveMenu}
      onDownload={() => void downloadFile()}
      onSaveToGallery={() => void saveToGallery()}
      colors={colors}
    />
  );

  if (isAudio) {
    return (
      <View
        style={[
          styles.audioContainer,
          {
            width: attachmentWidth,
            paddingRight: actionButtonSize + 14,
          },
        ]}
      >
        <AudioMessagePlayer url={attachment.url} isMe={isMe} colors={colors} />

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Свали ${attachment.name}`}
          disabled={isSaving}
          onPress={openSaveMenu}
          style={[
            styles.audioDownload,
            {
              width: actionButtonSize,
              height: actionButtonSize,
              borderRadius: actionButtonRadius,
              marginTop: -(actionButtonSize / 2),
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator
              size="small"
              color={isMe ? "#ffffff" : colors.primary}
            />
          ) : (
            <FontAwesome
              name="download"
              size={17}
              color={isMe ? "#ffffff" : colors.primary}
            />
          )}
        </TouchableOpacity>

        {downloadModal}
      </View>
    );
  }

  if (isImage) {
    return (
      <View
        style={[
          styles.imageContainer,
          {
            width: attachmentWidth,
          },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="imagebutton"
          accessibilityLabel={`Отвори ${attachment.name}`}
          activeOpacity={0.9}
          onPress={() => void WebBrowser.openBrowserAsync(attachment.url)}
          onLongPress={openSaveMenu}
        >
          <Image
            source={{ uri: attachment.url }}
            style={[
              styles.image,
              {
                width: attachmentWidth,
                height: imageHeight,
              },
            ]}
            contentFit="cover"
            transition={150}
          />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Запази снимката"
          disabled={isSaving}
          onPress={openSaveMenu}
          style={[
            styles.saveButton,
            {
              width: actionButtonSize,
              height: actionButtonSize,
              borderRadius: actionButtonRadius,
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <FontAwesome name="download" size={16} color="#ffffff" />
          )}
        </TouchableOpacity>

        {downloadModal}
      </View>
    );
  }

  const size = formatFileSize(attachment.size);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={openSaveMenu}
      disabled={isSaving}
      style={[
        styles.file,
        {
          width: attachmentWidth,
          backgroundColor: isMe
            ? "rgba(255,255,255,0.14)"
            : "rgba(127,127,127,0.1)",
        },
      ]}
    >
      <View
        style={[
          styles.fileIcon,
          {
            backgroundColor: isMe
              ? "rgba(255,255,255,0.18)"
              : `${colors.primary}1a`,
          },
        ]}
      >
        <FontAwesome
          name="file-o"
          size={22}
          color={isMe ? "#ffffff" : colors.primary}
        />
      </View>
      <View style={styles.fileText}>
        <Text
          style={[styles.fileName, { color: isMe ? "#ffffff" : colors.text }]}
          numberOfLines={2}
        >
          {attachment.name}
        </Text>
        {size ? (
          <Text
            style={{
              color: isMe ? "rgba(255,255,255,0.72)" : colors.textSecondary,
              fontSize: 11,
            }}
          >
            {size}
          </Text>
        ) : null}
      </View>
      <View style={styles.fileDownloadButton}>
        {isSaving ? (
          <ActivityIndicator
            size="small"
            color={isMe ? "#ffffff" : colors.primary}
          />
        ) : (
          <FontAwesome
            name="download"
            size={16}
            color={isMe ? "#ffffff" : colors.primary}
          />
        )}
      </View>
      {downloadModal}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  audioContainer: {
    position: "relative",
    minHeight: 40,
    justifyContent: "center",
  },

  audioDownload: {
    position: "absolute",
    right: 30,
    top: "20%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },

  imageContainer: {
    position: "relative",
    maxWidth: "100%",
  },

  image: {
    borderRadius: 14,
    backgroundColor: "rgba(127,127,127,0.15)",
  },

  saveButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.58)",
    alignItems: "center",
    justifyContent: "center",
  },

  file: {
    minHeight: 64,
    maxWidth: "100%",
    borderRadius: 13,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  fileText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },

  fileDownloadButton: {
    width: 36,
    height: 42,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  fileName: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
});
