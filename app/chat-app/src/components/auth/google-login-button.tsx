import { useAppTheme } from "@/app/_layout";
import { useAuth } from "@/hooks/useAuth";
import { TotpRequiredError, DeviceVerificationRequiredError, EmailCodeRequiredError } from "@/services/auth";
import {
  GoogleSignin,
  GoogleSigninButton,
} from "@react-native-google-signin/google-signin";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

// This is the Web OAuth client ID (client_type: 3) from google-services.json.
// The Android client ID (client_type: 1) is selected by the native Google
// Sign-In configuration and must not be passed as webClientId.
const GOOGLE_WEB_CLIENT_ID =
  "149310026747-0276747vvqrhrgapqcqlg9o1uekn2snr.apps.googleusercontent.com";

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

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
  const { colorScheme } = useAppTheme();
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
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {isSubmitting ? (
        <View style={styles.loadingButton}>
          <ActivityIndicator />
        </View>
      ) : (
        <GoogleSigninButton
          accessibilityLabel="Продължете с Google"
          color={
            colorScheme === "dark"
              ? GoogleSigninButton.Color.Dark
              : GoogleSigninButton.Color.Light
          }
          disabled={isSubmitting}
          onPress={() => void handleGoogleLogin()}
          size={GoogleSigninButton.Size.Wide}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 48, alignItems: "center" },
  button: { width: "100%", height: 48 },
  loadingButton: {
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
