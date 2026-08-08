import { FontAwesome } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ChatHeaderProps = {
  name: string;
  image?: string | null;
  isOnline: boolean;
  isTyping: boolean;
  onBack: () => void;

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
  isTyping,
  onBack,
  colors,
}: ChatHeaderProps) {
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

        <Text
          style={[
            styles.headerStatus,
            isTyping || isOnline ? styles.statusOnline : styles.statusOffline,
          ]}
        >
          {isTyping ? "пише..." : isOnline ? "на линия" : "неактивен"}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.infoButton}
        accessibilityRole="button"
        accessibilityLabel="Информация за разговора"
      >
        <FontAwesome
          name="info-circle"
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
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

  infoButton: {
    padding: 8,
  },
});
