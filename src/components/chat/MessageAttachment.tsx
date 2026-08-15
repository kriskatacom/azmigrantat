import type { ChatMessage } from "@/types/chat";
import { useSaveChatImage } from "@/hooks/chat/useSaveChatImage";
import { FontAwesome } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface AttachmentData {
  url: string;
  name: string;
  mimeType: string | null;
  size: number | null;
}

function metadataString(metadata: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

export function getMessageAttachment(message: ChatMessage): AttachmentData | null {
  if (message.type !== "image" && message.type !== "file") return null;
  const url = metadataString(message.metadata, ["url", "file_url", "download_url"])
    ?? (message.content?.startsWith("http") ? message.content : null);
  if (!url) return null;

  return {
    url,
    name: metadataString(message.metadata, ["name", "original_name", "file_name"])
      ?? decodeURIComponent(url.split("/").at(-1)?.split("?")[0] || (message.type === "image" ? "Снимка" : "Файл")),
    mimeType: metadataString(message.metadata, ["mime_type", "mimeType"]),
    size: typeof message.metadata?.size === "number" ? message.metadata.size : null,
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
  colors: { text: string; textSecondary: string; primary: string };
}

export default function MessageAttachment({ message, isMe, colors }: MessageAttachmentProps) {
  const attachment = getMessageAttachment(message);
  const { isSaving, openSaveMenu } = useSaveChatImage({
    messageId: message.id,
    url: attachment?.url ?? "",
    name: attachment?.name ?? "image.jpg",
    mimeType: attachment?.mimeType ?? null,
  });
  if (!attachment) return null;
  const isImage = message.type === "image" || attachment.mimeType?.startsWith("image/");

  if (isImage) {
    return (
      <View style={styles.imageContainer}>
        <TouchableOpacity accessibilityRole="imagebutton" accessibilityLabel={`Отвори ${attachment.name}`} activeOpacity={0.9} onPress={() => void WebBrowser.openBrowserAsync(attachment.url)} onLongPress={openSaveMenu}>
          <Image source={{ uri: attachment.url }} style={styles.image} contentFit="cover" transition={150} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Запази снимката" disabled={isSaving} onPress={openSaveMenu} style={styles.saveButton}>
          {isSaving ? <ActivityIndicator size="small" color="#ffffff" /> : <FontAwesome name="download" size={16} color="#ffffff" />}
        </TouchableOpacity>
      </View>
    );
  }

  const size = formatFileSize(attachment.size);
  return (
    <TouchableOpacity accessibilityRole="link" onPress={() => void WebBrowser.openBrowserAsync(attachment.url)} style={[styles.file, { backgroundColor: isMe ? "rgba(255,255,255,0.14)" : "rgba(127,127,127,0.1)" }]}>
      <View style={[styles.fileIcon, { backgroundColor: isMe ? "rgba(255,255,255,0.18)" : `${colors.primary}1a` }]}>
        <FontAwesome name="file-o" size={22} color={isMe ? "#ffffff" : colors.primary} />
      </View>
      <View style={styles.fileText}>
        <Text style={[styles.fileName, { color: isMe ? "#ffffff" : colors.text }]} numberOfLines={2}>{attachment.name}</Text>
        {size ? <Text style={{ color: isMe ? "rgba(255,255,255,0.72)" : colors.textSecondary, fontSize: 11 }}>{size}</Text> : null}
      </View>
      <FontAwesome name="download" size={16} color={isMe ? "#ffffff" : colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imageContainer: { position: "relative" },
  image: { width: 230, height: 190, borderRadius: 14, backgroundColor: "rgba(127,127,127,0.15)" },
  saveButton: { position: "absolute", top: 8, right: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.58)", alignItems: "center", justifyContent: "center" },
  file: { minWidth: 230, minHeight: 64, borderRadius: 13, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  fileIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fileText: { flex: 1, gap: 3 },
  fileName: { fontSize: 13, lineHeight: 17, fontWeight: "700" },
});
