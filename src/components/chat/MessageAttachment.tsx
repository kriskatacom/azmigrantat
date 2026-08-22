import type { ChatMessage } from "@/types/chat";
import {
  formatFileSize,
  getMessageAttachment,
  isAudioAttachment,
  isImageAttachment,
} from "@/utils/chat/attachment";
import { FontAwesome } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AudioMessagePlayer from "./audio-message-player";

export { getMessageAttachment };

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
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const attachmentWidth = Math.min(Math.max(width * 0.72, 210), 320);
  const imageHeight = Math.min(Math.max(height * 0.24, 160), 240);
  const actionButtonSize = Math.min(Math.max(width * 0.09, 34), 40);
  const actionButtonRadius = actionButtonSize / 2;
  const attachment = getMessageAttachment(message);
  const isImage = isImageAttachment(message.type, attachment?.mimeType ?? null);
  const isAudio = isAudioAttachment(message.type, attachment?.mimeType ?? null);

  if (!attachment) {
    return null;
  }

  const openDetails = () => {
    router.push({
      pathname: "/file/[id]",
      params: {
        id: String(message.id),
        conversationId: String(message.conversation_id),
      },
    });
  };

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
          accessibilityLabel={`Детайли за ${attachment.name}`}
          onPress={openDetails}
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
          <FontAwesome
            name="info"
            size={17}
            color={isMe ? "#ffffff" : colors.primary}
          />
        </TouchableOpacity>
      </View>
    );
  }

  if (isImage) {
    return (
      <View style={[styles.imageContainer, { width: attachmentWidth }]}>
        <TouchableOpacity
          accessibilityRole="imagebutton"
          accessibilityLabel={`Детайли за ${attachment.name}`}
          activeOpacity={0.9}
          onPress={openDetails}
        >
          <Image
            source={{ uri: attachment.url }}
            style={[styles.image, { width: attachmentWidth, height: imageHeight }]}
            contentFit="cover"
            transition={150}
          />
        </TouchableOpacity>
      </View>
    );
  }

  const size = formatFileSize(attachment.size);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Детайли за ${attachment.name}`}
      onPress={openDetails}
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
        <FontAwesome
          name="info-circle"
          size={16}
          color={isMe ? "#ffffff" : colors.primary}
        />
      </View>
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
