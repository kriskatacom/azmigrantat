import { LIVE_REACTION_TYPES, type LiveReactionType } from "@/types/live";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LiveReactions({
  onReact,
}: {
  onReact: (type: LiveReactionType) => void;
}) {
  return (
    <View style={styles.row}>
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
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 18 },
});
