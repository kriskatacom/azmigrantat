import { FontAwesome } from "@expo/vector-icons";
import type { RefObject } from "react";
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type ChatInputProps = {
  value: string;
  isSending: boolean;
  keyboardVisible: boolean;
  inputRef: RefObject<TextInput | null>;

  onChangeText: (value: string) => void;
  onSend: () => void;

  colors: {
    card: string;
    border: string;
    background: string;
    text: string;
    placeholder: string;
    button: string;
    buttonText: string;
    textSecondary: string;
  };
};

export default function ChatInput({
  value,
  isSending,
  keyboardVisible,
  inputRef,
  onChangeText,
  onSend,
  colors,
}: ChatInputProps) {
  const canSend = Boolean(value.trim()) && !isSending;

  return (
    <View
      style={[
        styles.inputContainer,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === "ios" ? 28 : keyboardVisible ? 8 : 60,
        },
      ]}
    >
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            color: colors.text,
          },
        ]}
        placeholder="Напиши съобщение..."
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline
        maxLength={10000}
        editable
      />

      <TouchableOpacity
        onPress={onSend}
        disabled={!canSend}
        style={[
          styles.sendButton,
          {
            backgroundColor: canSend ? colors.button : colors.textSecondary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Изпрати съобщението"
      >
        {isSending ? (
          <ActivityIndicator size="small" color={colors.buttonText} />
        ) : (
          <FontAwesome name="send" size={18} color={colors.buttonText} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    borderTopWidth: 1,
    alignItems: "center",
  },

  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    marginRight: 10,
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
