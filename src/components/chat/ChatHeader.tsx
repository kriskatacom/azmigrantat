import { FontAwesome } from "@expo/vector-icons";
import { copyText } from "@/utils/copy-text";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ChatHeaderProps = {
  name: string;
  image?: string | null;
  isOnline: boolean;
  lastSeenAt?: string | null;
  isTyping: boolean;
  publicCode?: string | null;
  onBack: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  onMorePress?: () => void;

  colors: {
    card: string;
    border: string;
    background: string;
    text: string;
    textSecondary: string;
  };
};

export default function ChatHeader({
  name,
  image,
  isOnline,
  lastSeenAt,
  isTyping,
  publicCode,
  onBack,
  onAudioCall,
  onVideoCall,
  onMorePress,
  colors,
}: ChatHeaderProps) {
  const formatLastSeen = (value?: string | null): string => {
    if (!value) {
      return "неактивен";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "неактивен";
    }

    const now = new Date();

    const diffMs = now.getTime() - date.getTime();

    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return "последно на линия преди малко";
    }

    if (diffMinutes < 60) {
      return `последно на линия преди ${diffMinutes} мин.`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
      return `последно на линия преди ${diffHours} ч.`;
    }

    return `последно на линия ${date.toLocaleDateString("bg-BG", {
      day: "2-digit",
      month: "2-digit",
    })}`;
  };

  return (
    <View
      style={[
        styles.chatHeader,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <FontAwesome name="chevron-left" size={20} color={colors.text} />
      </TouchableOpacity>

      {image ? (
        <Image source={{ uri: image }} style={styles.headerAvatar} />
      ) : (
        <View
          style={[
            styles.headerAvatarPlaceholder,
            {
              backgroundColor: colors.background,
            },
          ]}
        >
          <FontAwesome name="user" size={18} color={colors.textSecondary} />
        </View>
      )}

      <View style={styles.headerTitleContainer}>
        <Text
          style={[
            styles.headerName,
            {
              color: colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>

        {publicCode ? (
          <TouchableOpacity
            onPress={() => {
              void copyText(publicCode).then(() => {
                Alert.alert("Код на потребителя", publicCode);
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Копирай кода ${publicCode}`}
          >
            <Text
              selectable
              style={[styles.headerCode, { color: colors.textSecondary }]}
            >
              {publicCode}
            </Text>
          </TouchableOpacity>
        ) : null}

        <Text
          style={[
            styles.headerStatus,
            isTyping || isOnline ? styles.statusOnline : styles.statusOffline,
          ]}
        >
          {isTyping
            ? "пише..."
            : isOnline
              ? "на линия"
              : formatLastSeen(lastSeenAt)}
        </Text>
      </View>

      {onAudioCall || onVideoCall || onMorePress ? (
        <View style={styles.headerActions}>
          {onAudioCall ? (
            <TouchableOpacity
              onPress={onAudioCall}
              style={styles.videoButton}
              accessibilityRole="button"
              accessibilityLabel={`Аудио обаждане с ${name}`}
            >
              <FontAwesome name="phone" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : null}
          {onVideoCall ? (
            <TouchableOpacity
              onPress={onVideoCall}
              style={styles.videoButton}
              accessibilityRole="button"
              accessibilityLabel={`Видео обаждане с ${name}`}
            >
              <FontAwesome name="video-camera" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : null}
          {onMorePress ? (
            <TouchableOpacity
              onPress={onMorePress}
              style={styles.videoButton}
              accessibilityRole="button"
              accessibilityLabel="Още опции за чата"
            >
              <FontAwesome name="ellipsis-v" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chatHeader: {
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },

  backButton: {
    padding: 8,
    marginRight: 8,
  },

  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },

  headerName: {
    fontSize: 16,
    fontWeight: "700",
  },

  headerCode: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 1,
  },

  headerStatus: {
    fontSize: 12,
    marginTop: 2,
  },

  statusOnline: {
    color: "#22c55e",
  },

  statusOffline: {
    color: "#71717a",
  },

  videoButton: {
    padding: 8,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
});
