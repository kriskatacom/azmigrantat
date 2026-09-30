import { LIVE_REACTION_TYPES, type LiveReactionType } from "@/types/live";
import LiveReactionButton from "@/components/live/live-reaction-button";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LiveReactions({
  onReact,
  vertical = false,
  limit,
  onMore,
}: {
  onReact: (type: LiveReactionType) => void;
  vertical?: boolean;
  limit?: number;
  onMore?: () => void;
}) {
  const reactionTypes = limit ? LIVE_REACTION_TYPES.slice(0, limit) : LIVE_REACTION_TYPES;
  const buttons = reactionTypes.map((item) => (
    <LiveReactionButton
      key={item.type}
      emoji={item.emoji}
      label={`Реакция ${item.type}`}
      onPress={() => onReact(item.type)}
      size={44}
    />
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
      {onMore ? <MoreButton onPress={onMore} /> : null}
    </ScrollView>
  );
}

function MoreButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.moreButton}
      accessibilityRole="button"
      accessibilityLabel="Покажи още реакции"
    >
      <Text style={styles.moreText}>•••</Text>
    </TouchableOpacity>
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
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
    paddingBottom: 12,
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(8, 12, 24, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: { color: "#ffffff", fontSize: 18, fontWeight: "900", letterSpacing: 2 },
});
