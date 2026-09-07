import { useAppTheme } from "@/app/_layout";
import { useEffect, useRef } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type OtpCodeInputProps = {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  autoFocus?: boolean;
  error?: boolean;
  editable?: boolean;
};

export default function OtpCodeInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  error = false,
  editable = true,
}: OtpCodeInputProps) {
  const { theme } = useAppTheme();
  const inputRef = useRef<TextInput>(null);
  const digits = value.replace(/\D/g, "").slice(0, length);

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.colors.text }]}>
        Код за потвърждение
      </Text>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.boxes}
        accessibilityRole="button"
        accessibilityLabel="Въведи 6-цифрен код"
      >
        {Array.from({ length }, (_, index) => {
          const filled = Boolean(digits[index]);
          const active = digits.length === index;
          const borderColor = error
            ? theme.colors.danger
            : active
              ? theme.colors.primary
              : theme.colors.inputBorder;

          return (
            <View
              key={index}
              style={[
                styles.box,
                {
                  backgroundColor: theme.colors.input,
                  borderColor,
                  borderWidth: active || error ? 2 : 1,
                },
              ]}
            >
              <Text style={[styles.digit, { color: theme.colors.text }]}>
                {digits[index] ?? ""}
              </Text>
              {active && !filled ? (
                <View
                  style={[styles.caret, { backgroundColor: theme.colors.primary }]}
                />
              ) : null}
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          value={digits}
          onChangeText={(next) => onChange(next.replace(/\D/g, "").slice(0, length))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
          importantForAutofill="yes"
          maxLength={length}
          caretHidden
          editable={editable}
          autoFocus={autoFocus}
          style={styles.hiddenInput}
          accessibilityLabel="6-цифрен код"
        />
      </Pressable>
      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
        Кодът е 6 цифри. Може да се попълни автоматично от съобщението.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  boxes: {
    flexDirection: "row",
    gap: 8,
    position: "relative",
  },
  box: {
    flex: 1,
    aspectRatio: 0.82,
    maxHeight: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: {
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  caret: {
    position: "absolute",
    width: 2,
    height: 22,
    borderRadius: 1,
    opacity: 0.9,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
    color: "transparent",
    fontSize: 16,
  },
  hint: { fontSize: 12, lineHeight: 16 },
});
