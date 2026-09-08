import { useAppTheme } from "@/app/_layout";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function LiveViewerCount({
  count,
  variant = "theme",
}: {
  count: number;
  variant?: "theme" | "overlay";
}) {
  const { theme } = useAppTheme();
  const overlay = variant === "overlay";

  return (
    <View
      style={[
        styles.badge,
        overlay
          ? styles.overlayBadge
          : { backgroundColor: theme.colors.surface },
      ]}
    >
      <Ionicons name="eye-outline" size={16} color={overlay ? "#ffffff" : theme.colors.text} />
      <Text style={[styles.text, { color: overlay ? "#ffffff" : theme.colors.text }]}>
        {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  overlayBadge: {
    backgroundColor: "rgba(8, 12, 24, 0.72)",
  },
  text: { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
