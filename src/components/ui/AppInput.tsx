import { useAppTheme } from "@/app/_layout";
import { FontAwesome } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

interface AppInputProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
}

const AppInput = forwardRef<TextInput, AppInputProps>(
  (
    { label, error, isPassword = false, secureTextEntry, style, ...props },
    ref,
  ) => {
    const { theme } = useAppTheme();
    const [passwordVisible, setPasswordVisible] = useState(false);

    return (
      <View style={styles.wrapper}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {label}
        </Text>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.input,
              borderColor: error
                ? theme.colors.danger
                : theme.colors.inputBorder,
            },
          ]}
        >
          <TextInput
            ref={ref}
            {...props}
            style={[styles.input, { color: theme.colors.text }, style]}
            placeholderTextColor={theme.colors.placeholder}
            secureTextEntry={isPassword ? !passwordVisible : secureTextEntry}
            importantForAutofill={
              props.importantForAutofill
              ?? (props.autoComplete === "one-time-code" || props.autoComplete === "sms-otp"
                ? "yes"
                : undefined)
            }
          />

          {isPassword && (
            <TouchableOpacity
              onPress={() => setPasswordVisible((current) => !current)}
              style={styles.eyeButton}
              accessibilityRole="button"
              accessibilityLabel={
                passwordVisible ? "Скрий паролата" : "Покажи паролата"
              }
            >
              <FontAwesome
                name={passwordVisible ? "eye-slash" : "eye"}
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {error ? (
          <Text style={[styles.error, { color: theme.colors.danger }]}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);

AppInput.displayName = "AppInput";

export default AppInput;

const styles = StyleSheet.create({
  wrapper: { width: "100%", marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 7,
  },
  inputContainer: {
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  inputError: { borderColor: "#ef4444" },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { fontSize: 12, marginTop: 5 },
});
