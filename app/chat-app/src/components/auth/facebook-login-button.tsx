import { useAppTheme } from "@/app/_layout";
import { useAuth } from "@/hooks/useAuth";
import {
  ApiError,
  DeviceVerificationRequiredError,
  EmailCodeRequiredError,
  TotpRequiredError,
} from "@/services/auth";
import {
  isFacebookSignInEnabled,
  requestFacebookAccessToken,
} from "@/services/facebook-sdk";
import { FontAwesome } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from "react-native";

interface Props {
  rememberMe?: boolean;
  onTotpRequired?: (pendingToken: string) => void;
  onDeviceVerificationRequired?: (pendingToken: string, deviceName: string | null) => void;
  onEmailCodeRequired?: (pendingToken: string) => void;
}

export default function FacebookLoginButton(props: Props) {
  const { theme } = useAppTheme();
  const { loginWithFacebook } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const enabled = isFacebookSignInEnabled();

  const login = async () => {
    if (!enabled) {
      Alert.alert("Предстои", "Facebook входът ще бъде активиран след проверката на Meta.");
      return;
    }

    try {
      setSubmitting(true);
      const accessToken = await requestFacebookAccessToken();
      if (!accessToken) return;
      await loginWithFacebook(accessToken, props.rememberMe ?? false);
    } catch (error) {
      if (error instanceof TotpRequiredError && props.onTotpRequired) {
        props.onTotpRequired(error.pendingToken);
        return;
      }
      if (error instanceof DeviceVerificationRequiredError && props.onDeviceVerificationRequired) {
        props.onDeviceVerificationRequired(error.pendingToken, error.deviceName);
        return;
      }
      if (error instanceof EmailCodeRequiredError && props.onEmailCodeRequired) {
        props.onEmailCodeRequired(error.pendingToken);
        return;
      }

      const message = error instanceof ApiError && error.code === "facebook_link_required"
        ? "Вече има профил с този имейл. Влезте по досегашния начин и свържете Facebook от Профил → Сигурност."
        : error instanceof Error ? error.message : "Възникна неочаквана грешка.";
      Alert.alert("Неуспешен Facebook вход", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Pressable
      accessibilityLabel={enabled ? "Продължете с Facebook" : "Facebook входът предстои"}
      accessibilityState={{ disabled: submitting || !enabled }}
      disabled={submitting}
      onPress={() => void login()}
      style={[
        styles.button,
        { backgroundColor: enabled ? "#1877F2" : theme.colors.border, opacity: submitting ? 0.7 : 1 },
      ]}
    >
      {submitting ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <FontAwesome name="facebook" size={20} color="#FFFFFF" />
          <Text style={styles.label}>
            {enabled ? "Продължете с Facebook" : "Facebook вход — предстои"}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 48,
    borderRadius: 6,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  label: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
