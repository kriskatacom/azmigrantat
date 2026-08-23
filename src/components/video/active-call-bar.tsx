import { Ionicons } from "@expo/vector-icons";
import RemoteImage from "@/components/ui/RemoteImage";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ActiveCallBarProps = {
  visible: boolean;
  name: string;
  image?: string | null;
  durationSeconds: number;
  connected: boolean;
  onPress: () => void;
  onEndCall: () => void;
};

function formatDuration(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

export default function ActiveCallBar({
  visible,
  name,
  image,
  durationSeconds,
  connected,
  onPress,
  onEndCall,
}: ActiveCallBarProps) {
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Върни се към обаждането"
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.bar}
      >
        {image ? (
          <RemoteImage uri={image} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" color="#e0f2fe" size={18} />
          </View>
        )}
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          <Text style={styles.status}>
            {connected ? formatDuration(durationSeconds) : "Обаждане в ход"}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Приключи обаждането"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onEndCall}
          style={styles.endButton}
        >
          <Ionicons name="call" color="#ffffff" size={18} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 30,
  },
  bar: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 18,
    backgroundColor: "#0f766e",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#115e59",
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#115e59",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  status: {
    color: "#ccfbf1",
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  endButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e11d48",
    transform: [{ rotate: "135deg" }],
  },
});
