import { useAppTheme } from "@/app/_layout";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

type LiveCommentComposerProps = {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  keyboardVisible: boolean;
  compact?: boolean;
  transparentBackground?: boolean;
  showSendButton?: boolean;
  onOpenReactions?: () => void;
  onOpenComments?: () => void;
  onOpenMenu?: () => void;
  colors: {
    card: string;
    text: string;
    placeholder: string;
    inputBorder: string;
    input: string;
    primary: string;
  };
};

export default function LiveCommentComposer({
  value,
  placeholder,
  onChangeText,
  onSend,
  keyboardVisible,
  colors,
  compact = false,
  transparentBackground = false,
  showSendButton = keyboardVisible,
  onOpenReactions,
  onOpenComments,
  onOpenMenu,
}: LiveCommentComposerProps) {
  const { colorScheme } = useAppTheme();
  const canSend = value.trim().length > 0;

  return (
    <View
      style={[
        styles.row,
        transparentBackground && styles.transparentRow,
        {
          backgroundColor: transparentBackground ? "transparent" : colors.card,
          borderTopColor: colors.inputBorder,
          paddingBottom: keyboardVisible ? 0 : compact ? 8 : 10,
        },
      ]}
    >
      {transparentBackground ? (
        <TouchableOpacity
          onPress={onOpenReactions}
          style={styles.leadingButton}
          accessibilityRole="button"
          accessibilityLabel="Отвори реакциите"
        >
          <Ionicons name="happy-outline" size={25} color="#ffffff" />
        </TouchableOpacity>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colorScheme}
        underlineColorAndroid="transparent"
        cursorColor={colors.primary}
        selectionColor={colors.primary}
        style={[
          styles.input,
          {
            color: transparentBackground ? "#ffffff" : colors.text,
            backgroundColor: transparentBackground ? "transparent" : colors.input,
            borderColor: transparentBackground ? "transparent" : colors.inputBorder,
          },
        ]}
        maxLength={280}
        returnKeyType="send"
        onSubmitEditing={onSend}
        blurOnSubmit={false}
      />
      {transparentBackground ? (
        <TouchableOpacity
          onPress={onOpenMenu ?? onOpenComments}
          style={styles.moreButton}
          accessibilityRole="button"
          accessibilityLabel={onOpenMenu ? "Отвори опциите за предаването" : "Покажи всички коментари"}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#ffffff" />
        </TouchableOpacity>
      ) : null}
      {showSendButton ? (
        <TouchableOpacity
          onPress={onSend}
          disabled={!canSend}
          style={[styles.send, { backgroundColor: colors.primary, opacity: canSend ? 1 : 0.45 }]}
          accessibilityRole="button"
          accessibilityLabel="Изпрати коментар"
        >
          <Ionicons name="send" size={18} color="#ffffff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  transparentRow: {
    borderTopWidth: 0,
    minHeight: 54,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 27,
    gap: 6,
    backgroundColor: "rgba(28, 29, 32, 0.66)",
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  leadingButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(255,255,255,0.45)",
  },
  moreButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.34)",
  },
});
