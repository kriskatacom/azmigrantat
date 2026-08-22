import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import PasswordForm from "@/components/profile/password-form";
import ProfileField from "@/components/profile/profile-field";
import AppButton from "@/components/ui/AppButton";
import TotpSection from "@/components/profile/totp-section";
import { useAuth } from "@/hooks/useAuth";
import {
  ApiError,
  changePasswordRequest,
  clearLoginPinRequest,
  forgotPasswordRequest,
  resetPasswordRequest,
  setLoginPinRequest,
} from "@/services/auth";
import { authenticateCurrentUser } from "@/services/biometric";
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

export default function SecurityScreen() {
  const { theme } = useAppTheme();
  const {
    user,
    token,
    hasPin,
    hasDeviceSecret,
    fingerprintAvailable,
    deviceUnlockAvailable,
    fingerprintLoginEnabled,
    deviceLockLoginEnabled,
    setFingerprintLoginEnabledFlag,
    setDeviceLockLoginEnabledFlag,
    updateUser,
    endLocalSession,
  } = useAuth();
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResettingWithCode, setIsResettingWithCode] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailPasswordConfirmation, setEmailPasswordConfirmation] =
    useState("");
  const [pin, setPin] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");
  const [isSavingPin, setIsSavingPin] = useState(false);
  const canVerifyOnDevice =
    fingerprintAvailable || deviceUnlockAvailable;

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
      const useDeviceVerification = canVerifyOnDevice && currentPassword === null;

      if (useDeviceVerification) {
        const confirmed = await authenticateCurrentUser(
          "Потвърдете, за да смените паролата",
        );

        if (!confirmed) {
          throw new Error("Потвърждението беше отказано.");
        }
      }

      await changePasswordRequest(token, {
        ...(useDeviceVerification
          ? { verificationMethod: "device" }
          : { currentPassword: currentPassword ?? "", verificationMethod: "password" }),
        password,
        passwordConfirmation,
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

  const handleSavePin = async () => {
    if (!token || !user) {
      return;
    }

    const normalized = pin.replace(/\D/g, "");
    const confirmed = pinConfirmation.replace(/\D/g, "");

    if (normalized.length < 4 || normalized.length > 6) {
      Alert.alert("Невалиден PIN", "PIN кодът трябва да е между 4 и 6 цифри.");
      return;
    }

    if (normalized !== confirmed) {
      Alert.alert("Грешка", "PIN кодовете не съвпадат.");
      return;
    }

    try {
      setIsSavingPin(true);
      await setLoginPinRequest(token, normalized);
      await updateUser({ ...user, has_pin: true });
      setPin("");
      setPinConfirmation("");
      Alert.alert("Готово", "PIN кодът за вход е записан.");
    } catch (error) {
      Alert.alert(
        "Неуспешно",
        error instanceof Error ? error.message : "PIN кодът не беше записан.",
      );
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleClearPin = async () => {
    if (!token || !user) {
      return;
    }

    try {
      setIsSavingPin(true);
      await clearLoginPinRequest(token);
      await updateUser({ ...user, has_pin: false });
      Alert.alert("Готово", "PIN кодът за вход е премахнат.");
    } catch (error) {
      Alert.alert(
        "Неуспешно",
        error instanceof Error ? error.message : "PIN кодът не беше премахнат.",
      );
    } finally {
      setIsSavingPin(false);
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
          Начини за вход
        </Text>
        <Text
          style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}
        >
          От доверено устройство можете да избирате между парола, PIN,
          отпечатък и отключване на телефона. При първи вход от ново устройство
          трябва потвърждение от старото или код по имейл.
        </Text>

        <View
          style={[
            styles.methodCard,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
          ]}
        >
          <View
            style={[styles.methodIcon, { backgroundColor: theme.colors.background }]}
          >
            <FontAwesome name="key" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.methodText}>
            <Text style={[styles.methodTitle, { color: theme.colors.text }]}>
              Имейл и парола
            </Text>
            <Text
              style={[
                styles.methodDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              Винаги налично. При Google Authenticator ще поискаме и този код.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.methodCard,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
          ]}
        >
          <View
            style={[styles.methodIcon, { backgroundColor: theme.colors.background }]}
          >
            <FontAwesome name="th" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.methodText}>
            <Text style={[styles.methodTitle, { color: theme.colors.text }]}>
              PIN код на приложението
            </Text>
            <Text
              style={[
                styles.methodDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              {hasPin
                ? "Зададен е PIN за вход от това и другите доверени устройства."
                : "Задайте 4 до 6 цифри, за да влизате без паролата на профила."}
            </Text>
            <ProfileField
              label="Нов PIN"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="4 до 6 цифри"
            />
            <ProfileField
              label="Повтори PIN"
              value={pinConfirmation}
              onChangeText={setPinConfirmation}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
            <AppButton
              title={hasPin ? "Смени PIN кода" : "Задай PIN код"}
              loading={isSavingPin}
              onPress={() => void handleSavePin()}
            />
            {hasPin ? (
              <TouchableOpacity onPress={() => void handleClearPin()}>
                <Text
                  style={[styles.cancelCode, { color: theme.colors.textSecondary }]}
                >
                  Премахни PIN кода
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={() => {
            if (!fingerprintAvailable || !hasDeviceSecret) {
              Alert.alert(
                "Не е налично",
                !hasDeviceSecret
                  ? "Първо влезте успешно от това устройство, за да го направите доверено."
                  : "На това устройство няма записан пръстов отпечатък.",
              );
              return;
            }

            void setFingerprintLoginEnabledFlag(!fingerprintLoginEnabled);
          }}
          style={[
            styles.methodCard,
            {
              borderColor: fingerprintLoginEnabled
                ? theme.colors.primary
                : theme.colors.border,
              backgroundColor: theme.colors.card,
              opacity: fingerprintAvailable && hasDeviceSecret ? 1 : 0.55,
            },
          ]}
        >
          <View
            style={[styles.methodIcon, { backgroundColor: theme.colors.background }]}
          >
            <FontAwesome name="hand-o-up" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.methodText}>
            <Text style={[styles.methodTitle, { color: theme.colors.text }]}>
              Отпечатък
            </Text>
            <Text
              style={[
                styles.methodDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              Само пръстов отпечатък, без PIN на телефона. Работи след първи
              успешен вход от това устройство.
            </Text>
          </View>
          <View
            style={[
              styles.radio,
              {
                borderColor: theme.colors.primary,
                backgroundColor:
                  fingerprintLoginEnabled && fingerprintAvailable && hasDeviceSecret
                    ? theme.colors.primary
                    : "transparent",
              },
            ]}
          />
        </Pressable>

        <Pressable
          onPress={() => {
            if (!deviceUnlockAvailable || !hasDeviceSecret) {
              Alert.alert(
                "Не е налично",
                !hasDeviceSecret
                  ? "Първо влезте успешно от това устройство, за да го направите доверено."
                  : "Задайте PIN, фигура, парола или лицево разпознаване на телефона.",
              );
              return;
            }

            void setDeviceLockLoginEnabledFlag(!deviceLockLoginEnabled);
          }}
          style={[
            styles.methodCard,
            {
              borderColor: deviceLockLoginEnabled
                ? theme.colors.primary
                : theme.colors.border,
              backgroundColor: theme.colors.card,
              opacity: deviceUnlockAvailable && hasDeviceSecret ? 1 : 0.55,
            },
          ]}
        >
          <View
            style={[styles.methodIcon, { backgroundColor: theme.colors.background }]}
          >
            <FontAwesome name="lock" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.methodText}>
            <Text style={[styles.methodTitle, { color: theme.colors.text }]}>
              Отключване на телефона
            </Text>
            <Text
              style={[
                styles.methodDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              PIN, фигура, парола или лицево разпознаване, с които отключвате
              телефона.
            </Text>
          </View>
          <View
            style={[
              styles.radio,
              {
                borderColor: theme.colors.primary,
                backgroundColor:
                  deviceLockLoginEnabled && deviceUnlockAvailable && hasDeviceSecret
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
          {canVerifyOnDevice
            ? " Потвърждавате с отпечатък или отключване на телефона, без да пишете старата парола."
            : " За потвърждение въведете текущата парола на профила."}
        </Text>
        <PasswordForm
          isSaving={isSavingPassword}
          requireCurrentPassword={!canVerifyOnDevice}
          onSave={handleChangePassword}
        />

        <TotpSection />

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
    alignItems: "flex-start",
    gap: 12,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  methodText: { flex: 1, gap: 8 },
  methodTitle: { fontSize: 16, fontWeight: "700" },
  methodDescription: { fontSize: 13, lineHeight: 18 },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 10,
    marginTop: 12,
  },
  emailCodeForm: { gap: 14 },
  cancelCode: {
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 4,
  },
});
