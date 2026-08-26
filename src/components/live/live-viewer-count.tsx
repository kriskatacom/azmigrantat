import { useAppTheme } from "@/app/_layout";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function LiveViewerCount({ count }: { count: number }) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
      <Ionicons name="eye-outline" size={16} color={theme.colors.text} />
      <Text style={[styles.text, { color: theme.colors.text }]}>{count}</Text>
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
  text: { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
