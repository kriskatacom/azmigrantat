import {
  getReactionEmoji,
  getReactionLabel,
  type MessageReactionItem,
  type MessageReactionType,
} from "@/constants/message-reactions";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ChatMessageReactionsProps = {
  reactions: MessageReactionItem[];
  align: "left" | "right";
  onPress: (type: MessageReactionType) => void;
  colors: {
    card: string;
    border: string;
    text: string;
    primary: string;
  };
};

export default function ChatMessageReactions({
  reactions,
  align,
  onPress,
  colors,
}: ChatMessageReactionsProps) {
  if (reactions.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.row,
        align === "right" ? styles.rowRight : styles.rowLeft,
      ]}
    >
      {reactions.map((reaction) => (
        <TouchableOpacity
          key={reaction.type}
          accessibilityLabel={`${getReactionLabel(reaction.type)}, ${reaction.count}`}
          accessibilityRole="button"
          onPress={() => onPress(reaction.type)}
          style={[
            styles.chip,
            {
              backgroundColor: colors.card,
              borderColor: reaction.reacted ? colors.primary : colors.border,
            },
          ]}
        >
          <Text style={styles.emoji}>{getReactionEmoji(reaction.type)}</Text>
          {reaction.count > 1 ? (
            <Text style={[styles.count, { color: colors.text }]}>
              {reaction.count}
            </Text>
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
    maxWidth: "100%",
  },
  rowRight: {
    alignSelf: "flex-end",
  },
  rowLeft: {
    alignSelf: "flex-start",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    fontSize: 12,
    fontWeight: "700",
  },
});
