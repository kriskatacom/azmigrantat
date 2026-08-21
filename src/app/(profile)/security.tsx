import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import PasswordForm from "@/components/profile/password-form";
import ProfileField from "@/components/profile/profile-field";
import AppButton from "@/components/ui/AppButton";
import { useAuth } from "@/hooks/useAuth";
import {
  ApiError,
  changePasswordRequest,
  forgotPasswordRequest,
  resetPasswordRequest,
} from "@/services/auth";
import { authenticateWithBiometrics } from "@/services/biometric";
import { FontAwesome } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type LoginMethod = "password" | "biometrics";

export default function SecurityScreen() {
  const { theme } = useAppTheme();
  const {
    user,
    token,
    biometricSupported,
    biometricLoginEnabled,
    biometricLabel,
    enableBiometricLogin,
    disableBiometricLogin,
    updateBiometricCredentials,
    endLocalSession,
  } = useAuth();
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUpdatingLoginMethod, setIsUpdatingLoginMethod] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResettingWithCode, setIsResettingWithCode] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailPasswordConfirmation, setEmailPasswordConfirmation] =
    useState("");

  const selectedMethod: LoginMethod = biometricLoginEnabled
    ? "biometrics"
    : "password";

  const handleSelectLoginMethod = async (method: LoginMethod) => {
    if (isUpdatingLoginMethod || method === selectedMethod) {
      return;
    }

    if (method === "biometrics" && !biometricSupported) {
      Alert.alert(
        "Не е налично",
        "На това устройство са нужни и биометрия, и PIN, фигура или парола.",
      );
      return;
    }

    try {
      setIsUpdatingLoginMethod(true);

      if (method === "biometrics") {
        await enableBiometricLogin();
      } else {
        await disableBiometricLogin();
      }
    } catch (error) {
      Alert.alert(
        "Неуспешно",
        error instanceof Error
          ? error.message
          : "Начинът на вход не можа да бъде променен.",
      );
    } finally {
      setIsUpdatingLoginMethod(false);
    }
  };

  const handleChangePassword = async (
    currentPassword: string | null,
    password: string,
    passwordConfirmation: string,
  ) => {
    if (!token || !user) {
      return false;
    }

    setIsSavingPassword(true);
    try {
      const useDeviceVerification = biometricSupported && currentPassword === null;

      if (useDeviceVerification) {
        const confirmed = await authenticateWithBiometrics(
          "Потвърдете, за да смените паролата",
        );

        if (!confirmed) {
          throw new Error("Биометричното потвърждение беше отказано.");
        }
      }

      await changePasswordRequest(token, {
        ...(useDeviceVerification
          ? { verificationMethod: "device" }
          : { currentPassword: currentPassword ?? "", verificationMethod: "password" }),
        password,
        passwordConfirmation,
      });
      await updateBiometricCredentials({
        email: user.email,
        password,
      });
      Alert.alert("Готово", "Паролата беше сменена успешно.");
      return true;
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Паролата не можа да бъде сменена.",
      );
      return false;
    } finally {
      setIsSavingPassword(false);
    }
  };

  const emailCodeMessage = (error: unknown): string => {
    if (error instanceof ApiError && error.status === 429) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Възникна неочаквана грешка.";
  };

  const handleSendEmailCode = async () => {
    if (!user?.email) {
      Alert.alert("Липсва имейл", "В профила няма имейл за изпращане на код.");
      return;
    }

    try {
      setIsSendingCode(true);
      const response = await forgotPasswordRequest(user.email);
      setEmailCodeSent(true);
      Alert.alert("Проверете имейла", response.message);
    } catch (error) {
      Alert.alert(
        error instanceof ApiError && error.status === 429
          ? "Ограничение"
          : "Неуспешно изпращане",
        emailCodeMessage(error),
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResetPasswordWithEmailCode = async () => {
    if (!user?.email) {
      return;
    }

    const normalizedCode = emailCode.replace(/\D/g, "");

    if (normalizedCode.length !== 6) {
      Alert.alert("Невалиден код", "Въведете 6-цифрения код от имейла.");
      return;
    }

    if (emailPassword.length < 8) {
      Alert.alert("Невалидна парола", "Новата парола трябва да е поне 8 символа.");
      return;
    }

    if (emailPassword !== emailPasswordConfirmation) {
      Alert.alert("Грешка", "Паролите не съвпадат.");
      return;
    }

    try {
      setIsResettingWithCode(true);
      const response = await resetPasswordRequest({
        email: user.email,
        code: normalizedCode,
        password: emailPassword,
        passwordConfirmation: emailPasswordConfirmation,
      });
      await updateBiometricCredentials({
        email: user.email,
        password: emailPassword,
      });
      setEmailCode("");
      setEmailPassword("");
      setEmailPasswordConfirmation("");
      setEmailCodeSent(false);
      await endLocalSession();
      Alert.alert("Готово", response.message);
    } catch (error) {
      Alert.alert(
        error instanceof ApiError && error.status === 429
          ? "Ограничение"
          : "Неуспешна промяна",
        emailCodeMessage(error),
      );
    } finally {
      setIsResettingWithCode(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <Header title="Сигурност" hideSearchButton hideAuthButton />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Начин на вход
        </Text>
        <Text
          style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}
        >
          Изберете с какво да се удостоверявате при следващ вход. Може да е
          паролата на профила или биометрията и заключването на телефона.
        </Text>

        <Pressable
          onPress={() => void handleSelectLoginMethod("password")}
          disabled={isUpdatingLoginMethod}
          style={[
            styles.methodCard,
            {
              borderColor:
                selectedMethod === "password"
                  ? theme.colors.primary
                  : theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
          accessibilityRole="radio"
          accessibilityState={{
            selected: selectedMethod === "password",
            disabled: isUpdatingLoginMethod,
          }}
          accessibilityLabel="Вход с паролата на профила"
        >
          <View
            style={[
              styles.methodIcon,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <FontAwesome name="key" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.methodText}>
            <Text style={[styles.methodTitle, { color: theme.colors.text }]}>
              Парола на профила
            </Text>
            <Text
              style={[
                styles.methodDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              Влизате с имейл и текущата парола на акаунта.
            </Text>
          </View>
          <View
            style={[
              styles.radio,
              {
                borderColor: theme.colors.primary,
                backgroundColor:
                  selectedMethod === "password"
                    ? theme.colors.primary
                    : "transparent",
              },
            ]}
          />
        </Pressable>

        <Pressable
          onPress={() => void handleSelectLoginMethod("biometrics")}
          disabled={isUpdatingLoginMethod || !biometricSupported}
          style={[
            styles.methodCard,
            {
              borderColor:
                selectedMethod === "biometrics"
                  ? theme.colors.primary
                  : theme.colors.border,
              backgroundColor: theme.colors.card,
              opacity: biometricSupported ? 1 : 0.55,
            },
          ]}
          accessibilityRole="radio"
          accessibilityState={{
            selected: selectedMethod === "biometrics",
            disabled: isUpdatingLoginMethod || !biometricSupported,
          }}
          accessibilityLabel={`Вход с ${biometricLabel}`}
        >
          <View
            style={[
              styles.methodIcon,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <FontAwesome
              name="lock"
              size={18}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.methodText}>
            <Text style={[styles.methodTitle, { color: theme.colors.text }]}>
              Биометрия и PIN
            </Text>
            <Text
              style={[
                styles.methodDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              {biometricSupported
                ? "Първо пръстов отпечатък или лицево разпознаване, после PIN, фигура или парола на телефона."
                : "На това устройство липсва биометрия или PIN, фигура и парола."}
            </Text>
          </View>
          <View
            style={[
              styles.radio,
              {
                borderColor: theme.colors.primary,
                backgroundColor:
                  selectedMethod === "biometrics"
                    ? theme.colors.primary
                    : "transparent",
              },
            ]}
          />
        </Pressable>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Смяна на парола
        </Text>
        <Text
          style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}
        >
          Новата парола трябва да съдържа поне 8 символа.
          {biometricSupported
            ? " Потвърждавате с биометрия и PIN на телефона, без да пишете старата парола."
            : " За потвърждение въведете текущата парола на профила."}
        </Text>
        <PasswordForm
          isSaving={isSavingPassword}
          requireCurrentPassword={!biometricSupported}
          onSave={handleChangePassword}
        />

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Код по имейл
        </Text>
        <Text
          style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}
        >
          Ще изпратим 6-цифрен код на {user?.email ?? "имейла на профила"}. С
          него можете да зададете нова парола, без текущата и без биометрия.
        </Text>

        <AppButton
          title={
            emailCodeSent
              ? "Изпрати кода отново"
              : "Изпрати код за смяна на паролата"
          }
          loading={isSendingCode}
          disabled={isResettingWithCode}
          onPress={() => void handleSendEmailCode()}
        />

        {emailCodeSent ? (
          <View style={styles.emailCodeForm}>
            <ProfileField
              label="Код от имейла"
              value={emailCode}
              onChangeText={setEmailCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete={
                Platform.OS === "android" ? "sms-otp" : "one-time-code"
              }
              maxLength={6}
              placeholder="6 цифри"
            />
            <ProfileField
              label="Нова парола"
              value={emailPassword}
              onChangeText={setEmailPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <ProfileField
              label="Повтори новата парола"
              value={emailPasswordConfirmation}
              onChangeText={setEmailPasswordConfirmation}
              secureTextEntry
              autoComplete="new-password"
            />
            <AppButton
              title="Смени паролата с кода"
              loading={isResettingWithCode}
              disabled={isSendingCode}
              onPress={() => void handleResetPasswordWithEmailCode()}
            />
            <TouchableOpacity
              onPress={() => {
                setEmailCodeSent(false);
                setEmailCode("");
                setEmailPassword("");
                setEmailPasswordConfirmation("");
              }}
              disabled={isResettingWithCode}
            >
              <Text
                style={[styles.cancelCode, { color: theme.colors.textSecondary }]}
              >
                Отказ
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  sectionDescription: { fontSize: 14, lineHeight: 20, marginTop: -6 },
  methodCard: {
    minHeight: 84,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  methodText: { flex: 1, gap: 4 },
  methodTitle: { fontSize: 16, fontWeight: "700" },
  methodDescription: { fontSize: 13, lineHeight: 18 },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 10,
  },
  emailCodeForm: { gap: 14 },
  cancelCode: {
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 4,
  },
});
