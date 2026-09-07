import { useLinkPreview } from "@/hooks/chat/useLinkPreview";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface LinkPreviewCardProps {
  token?: string | null;
  url: string;
  colors: { card: string; text: string; textSecondary: string };
  isMe: boolean;
}

export default function LinkPreviewCard({
  token,
  url,
  colors,
  isMe,
}: LinkPreviewCardProps) {
  const [imageError, setImageError] = useState(false);
  const preview = useLinkPreview(token, url);
  if (!preview || (!preview.title && !preview.description && !preview.image))
    return null;

  let hostname = preview.site_name;
  try {
    hostname ||= new URL(preview.url || url).hostname.replace(/^www\./, "");
  } catch {}

  const hasImage =
    !imageError &&
    typeof preview.image === "string" &&
    preview.image.trim() !== "" &&
    preview.image !== "null";

  return (
    <TouchableOpacity
      accessibilityRole="link"
      activeOpacity={0.8}
      onPress={() => void WebBrowser.openBrowserAsync(preview.url || url)}
      style={[
        styles.card,
        {
          backgroundColor: isMe ? "rgba(255,255,255,0.14)" : colors.card,
          borderColor: isMe ? "rgba(255,255,255,0.24)" : colors.textSecondary,
        },
      ]}
    >
      {hasImage && (
        <Image
          source={{ uri: preview.image! }}
          style={styles.image}
          contentFit="cover"
          transition={150}
          onError={() => setImageError(true)}
        />
      )}
      <View style={styles.content}>
        {hostname ? (
          <Text
            style={[
              styles.site,
              { color: isMe ? "rgba(255,255,255,0.75)" : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {hostname}
          </Text>
        ) : null}
        {preview.title ? (
          <Text
            style={[styles.title, { color: isMe ? "#ffffff" : colors.text }]}
            numberOfLines={2}
          >
            {preview.title}
          </Text>
        ) : null}
        {preview.description ? (
          <Text
            style={[
              styles.description,
              { color: isMe ? "rgba(255,255,255,0.82)" : colors.textSecondary },
            ]}
            numberOfLines={3}
          >
            {preview.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 9,
    borderWidth: 0.5,
    borderRadius: 13,
    overflow: "hidden",
    minWidth: 220,
  },
  image: { width: "100%", height: 120 },
  content: { padding: 10, gap: 4 },
  site: { fontSize: 11, textTransform: "uppercase" },
  title: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  description: { fontSize: 12, lineHeight: 17 },
});
