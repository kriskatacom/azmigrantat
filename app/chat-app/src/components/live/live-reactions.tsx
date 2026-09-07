import { LIVE_REACTION_TYPES, type LiveReactionType } from "@/types/live";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LiveReactions({
  onReact,
  vertical = false,
}: {
  onReact: (type: LiveReactionType) => void;
  vertical?: boolean;
}) {
  const buttons = LIVE_REACTION_TYPES.map((item) => (
    <TouchableOpacity
      key={item.type}
      onPress={() => onReact(item.type)}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={`Реакция ${item.type}`}
    >
      <Text style={styles.emoji}>{item.emoji}</Text>
    </TouchableOpacity>
  ));

  if (!vertical) {
    return <View style={styles.row}>{buttons}</View>;
  }

  return (
    <ScrollView
      style={styles.columnScroll}
      contentContainerStyle={styles.columnContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      bounces={false}
    >
      {buttons}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  columnScroll: {
    flex: 1,
    width: 48,
  },
  columnContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
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
