import { useAuth } from "@/hooks/useAuth";
import {
  DeviceVerificationRequiredError,
  EmailCodeRequiredError,
  TotpRequiredError,
} from "@/services/auth";
import { FontAwesome } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

// This is the Web OAuth client ID (client_type: 3) from google-services.json.
// The Android client ID (client_type: 1) is selected by the native Google
// Sign-In configuration and must not be passed as webClientId.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

if (GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
}

interface GoogleLoginButtonProps {
  rememberMe?: boolean;
  onTotpRequired?: (pendingToken: string) => void;
  onDeviceVerificationRequired?: (
    pendingToken: string,
    deviceName: string | null,
  ) => void;
  onEmailCodeRequired?: (pendingToken: string) => void;
}

export default function GoogleLoginButton({
  rememberMe = false,
  onTotpRequired,
  onDeviceVerificationRequired,
  onEmailCodeRequired,
}: GoogleLoginButtonProps) {
  const { loginWithGoogle } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      Alert.alert(
        "Липсва Google конфигурация",
        "Добавете EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID в env конфигурацията.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      if (process.env.EXPO_OS === "android") {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const result = await GoogleSignin.signIn();

      if (result.type === "cancelled") return;

      if (!result.data.idToken) {
        throw new Error("Google не върна валиден ID token.");
      }

      await loginWithGoogle(result.data.idToken, rememberMe);
    } catch (error) {
      if (error instanceof TotpRequiredError) {
        if (onTotpRequired) {
          onTotpRequired(error.pendingToken);
          return;
        }
      }

      if (error instanceof DeviceVerificationRequiredError) {
        if (onDeviceVerificationRequired) {
          onDeviceVerificationRequired(error.pendingToken, error.deviceName);
          return;
        }
      }

      if (error instanceof EmailCodeRequiredError) {
        if (onEmailCodeRequired) {
          onEmailCodeRequired(error.pendingToken);
          return;
        }
      }

      Alert.alert(
        "Неуспешен Google вход",
        error instanceof Error
          ? error.message
          : "Възникна неочаквана грешка.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Pressable
      accessibilityLabel="Продължете с Google"
      accessibilityRole="button"
      accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
      disabled={isSubmitting}
      onPress={() => void handleGoogleLogin()}
      style={[
        styles.button,
        { opacity: isSubmitting ? 0.7 : 1 },
      ]}
    >
      {isSubmitting ? (
        <ActivityIndicator color="#4285F4" />
      ) : (
        <>
          <FontAwesome name="google" size={20} color="#4285F4" />
          <Text style={styles.label}>Продължете с Google</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#747775",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  label: { color: "#1F1F1F", fontSize: 16, fontWeight: "700" },
});
