import {
  MESSAGE_REACTIONS,
  type MessageReactionType,
} from "@/constants/message-reactions";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ChatReactionPickerProps = {
  visible: boolean;
  selectedType?: MessageReactionType | null;
  onSelect: (type: MessageReactionType) => void;
  onClose: () => void;
  colors: {
    card: string;
    border: string;
    text: string;
    primary: string;
  };
};

export default function ChatReactionPicker({
  visible,
  selectedType,
  onSelect,
  onClose,
  colors,
}: ChatReactionPickerProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Затвори реакциите"
        onPress={onClose}
        style={styles.backdrop}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Реакция</Text>
          <View style={styles.grid}>
            {MESSAGE_REACTIONS.map((reaction) => {
              const selected = selectedType === reaction.type;

              return (
                <TouchableOpacity
                  key={reaction.type}
                  accessibilityLabel={reaction.label}
                  accessibilityRole="button"
                  onPress={() => onSelect(reaction.type)}
                  style={[
                    styles.emojiButton,
                    selected && {
                      backgroundColor: `${colors.primary}22`,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={styles.emoji}>{reaction.emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  emojiButton: {
    width: "18%",
    aspectRatio: 1,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 26,
  },
});
