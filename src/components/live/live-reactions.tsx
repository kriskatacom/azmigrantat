import { LIVE_REACTION_TYPES, type LiveReactionType } from "@/types/live";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LiveReactions({
  onReact,
  vertical = false,
}: {
  onReact: (type: LiveReactionType) => void;
  vertical?: boolean;
}) {
  return (
    <View style={vertical ? styles.column : styles.row}>
      {LIVE_REACTION_TYPES.map((item) => (
        <TouchableOpacity
          key={item.type}
          onPress={() => onReact(item.type)}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel={`Реакция ${item.type}`}
        >
          <Text style={styles.emoji}>{item.emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  column: { flexDirection: "column", gap: 8, alignItems: "center" },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(8, 12, 24, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 20 },
});
