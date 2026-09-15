import { FontAwesome } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function VideoViewsBadge({ count }: { count: number }) {
  return (
    <View style={styles.badge} pointerEvents="none">
      <FontAwesome name="eye" size={11} color="#ffffff" />
      <Text style={styles.text}>{Math.max(0, count).toLocaleString("bg-BG")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 7,
    left: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  text: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
});
