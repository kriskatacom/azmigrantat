import { useNetwork } from "@/hooks/useNetwork";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function OfflineScreen() {
  const { isOffline, refresh } = useNetwork();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOffline) {
    return null;
  }

  const handleRetry = async () => {
    setIsRefreshing(true);

    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View
      accessibilityLabel="Няма интернет"
      accessibilityLiveRegion="polite"
      style={styles.screen}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={56} color="#9EC9D6" />
      </View>

      <Text style={styles.title}>Няма интернет</Text>
      <Text style={styles.description}>
        Проверете връзката си. Екранът ще се затвори автоматично, когато отново
        имате интернет.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Провери отново"
        disabled={isRefreshing}
        onPress={() => {
          void handleRetry();
        }}
        style={({ pressed }) => [
          styles.retryButton,
          pressed && styles.retryButtonPressed,
        ]}
      >
        {isRefreshing ? (
          <ActivityIndicator color="#0E3545" />
        ) : (
          <Text style={styles.retryLabel}>Провери отново</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    zIndex: 90,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#0E3545",
  },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(158, 201, 214, 0.12)",
  },
  title: {
    marginTop: 22,
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    marginTop: 12,
    color: "#9EC9D6",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 28,
    minWidth: 180,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8E296",
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryLabel: {
    color: "#0E3545",
    fontSize: 16,
    fontWeight: "800",
  },
});
