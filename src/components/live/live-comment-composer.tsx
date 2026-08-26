import { useAppTheme } from "@/app/_layout";
import { FontAwesome } from "@expo/vector-icons";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

type LiveCommentComposerProps = {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  keyboardVisible: boolean;
  compact?: boolean;
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
}: LiveCommentComposerProps) {
  const { colorScheme } = useAppTheme();
  const canSend = value.trim().length > 0;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.inputBorder,
          paddingBottom: keyboardVisible ? 0 : compact ? 8 : 10,
        },
      ]}
    >
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
            color: colors.text,
            backgroundColor: colors.input,
            borderColor: colors.inputBorder,
          },
        ]}
        maxLength={280}
        returnKeyType="send"
        onSubmitEditing={onSend}
        blurOnSubmit={false}
      />
      <TouchableOpacity
        onPress={onSend}
        disabled={!canSend}
        style={[styles.send, { backgroundColor: colors.primary, opacity: canSend ? 1 : 0.45 }]}
        accessibilityRole="button"
        accessibilityLabel="Изпрати коментар"
      >
        <FontAwesome name="send" size={16} color="#ffffff" />
      </TouchableOpacity>
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
});
