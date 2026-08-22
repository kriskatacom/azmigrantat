import { useAppTheme } from "@/app/_layout";
import AuthLegalLinks from "@/components/auth/auth-legal-links";
import BiometricLoginButton from "@/components/auth/biometric-login-button";
import GoogleLoginButton from "@/components/auth/google-login-button";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import { useAuth } from "@/hooks/useAuth";
import {
  DeviceVerificationRequiredError,
  EmailCodeRequiredError,
  TotpRequiredError,
  devicePendingStatusRequest,
  loginOptionsRequest,
  resendEmailLoginCodeRequest,
  sendDeviceEmailCodeRequest,
} from "@/services/auth";
import { getLastLoginEmail } from "@/services/device-identity";
import { FontAwesome } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type LoginStep =
  | "methods"
  | "password"
  | "pin"
  | "device"
  | "email"
  | "totp"
  | "loginEmail";

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const {
    login,
    loginWithPin,
    loginWithFingerprint,
    loginWithDeviceLock,
    completeTotpLogin,
    completeDevicePending,
    completeDeviceEmailCode,
    completeEmailLogin,
    lastLoginEmail,
    canUseFingerprintLogin,
    canUseDeviceLockLogin,
  } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trustedDevice, setTrustedDevice] = useState(false);
  const [serverHasPin, setServerHasPin] = useState(false);
  const [step, setStep] = useState<LoginStep>("password");
  const [devicePendingToken, setDevicePendingToken] = useState<string | null>(
    null,
  );
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [totpPendingToken, setTotpPendingToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [loginEmailPendingToken, setLoginEmailPendingToken] = useState<
    string | null
  >(null);
  const [loginEmailCode, setLoginEmailCode] = useState("");

  const passwordRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const completingDeviceRef = useRef(false);

  const showMethodPicker =
    trustedDevice &&
    (canUseFingerprintLogin ||
      canUseDeviceLockLogin ||
      serverHasPin);

  const applyOptions = useCallback(
    async (nextEmail: string) => {
      if (!nextEmail.includes("@")) {
        setTrustedDevice(false);
        setServerHasPin(false);
        return;
      }

      try {
        const options = await loginOptionsRequest(nextEmail);
        setTrustedDevice(options.trusted);
        setServerHasPin(options.hasPin);

        if (options.trusted) {
          setStep("methods");
        }
      } catch {
        setTrustedDevice(false);
        setServerHasPin(false);
      }
    },
    [],
  );

  useEffect(() => {
    void (async () => {
      const stored = lastLoginEmail ?? (await getLastLoginEmail());

      if (stored) {
        setEmail(stored);
        await applyOptions(stored);
      }
    })();
  }, [applyOptions, lastLoginEmail]);

  useEffect(() => {
    if (!devicePendingToken || step !== "device") {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const status = await devicePendingStatusRequest(devicePendingToken);

        if (cancelled) {
          return;
        }

        if (status.approved) {
          if (completingDeviceRef.current) {
            return;
          }

          completingDeviceRef.current = true;

          try {
            await completeDevicePending(devicePendingToken);
          } catch (error) {
            completingDeviceRef.current = false;

            if (!cancelled) {
              Alert.alert(
                "Неуспешен вход",
                error instanceof Error
                  ? error.message
                  : "Потвърждението не можа да завърши входа.",
              );
            }
          }
        }
      } catch {
        // Keep waiting until expiry; the next poll or a new login will surface errors.
      }
    };

    void poll();
    const interval = setInterval(() => {
      void poll();
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [completeDevicePending, devicePendingToken, step]);

  const fadeOut = () => {
    return new Promise<void>((resolve) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        resolve();
      });
    });
  };

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const handleAuthError = (error: unknown) => {
    fadeIn();

    if (error instanceof DeviceVerificationRequiredError) {
      setDevicePendingToken(error.pendingToken);
      setDeviceName(error.deviceName);
      setStep("device");
      setEmailCodeSent(false);
      setEmailCode("");
      return;
    }

    if (error instanceof TotpRequiredError) {
      setTotpPendingToken(error.pendingToken);
      setTotpCode("");
      setStep("totp");
      return;
    }

    if (error instanceof EmailCodeRequiredError) {
      setLoginEmailPendingToken(error.pendingToken);
      setLoginEmailCode("");
      setStep("loginEmail");
      return;
    }

    const message =
      error instanceof Error ? error.message : "Възникна неочаквана грешка.";

    if (
      message !== "Потвърждението с отпечатък беше отказано." &&
      message !== "Отключването на телефона беше отказано."
    ) {
      Alert.alert("Неуспешен вход", message);
    }
  };

  const handlePasswordLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert("Липсващи данни", "Въведете имейл и парола.");
      return;
    }

    try {
      setIsSubmitting(true);
      await fadeOut();
      await login({
        email: normalizedEmail,
        password,
        rememberMe,
      });
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinLogin = async () => {
    if (pin.replace(/\D/g, "").length < 4) {
      Alert.alert("Липсва PIN", "Въведете PIN кода за приложението.");
      return;
    }

    try {
      setIsSubmitting(true);
      await loginWithPin(pin, rememberMe);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmEmailLogin = async () => {
    if (!loginEmailPendingToken) {
      return;
    }

    const normalized = loginEmailCode.replace(/\D/g, "");
    if (normalized.length !== 6) {
      Alert.alert("Липсва код", "Въведете 6-цифрения код от имейла.");
      return;
    }

    try {
      setIsSubmitting(true);
      await completeEmailLogin(loginEmailPendingToken, normalized);
    } catch (error) {
      if (error instanceof EmailCodeRequiredError) {
        handleAuthError(error);
        return;
      }
      Alert.alert(
        "Неуспешен код",
        error instanceof Error ? error.message : "Кодът не беше приет.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendLoginEmail = async () => {
    if (!loginEmailPendingToken) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await resendEmailLoginCodeRequest(loginEmailPendingToken);
      Alert.alert("Проверете имейла", response.message);
    } catch (error) {
      Alert.alert(
        "Неуспешно изпращане",
        error instanceof Error ? error.message : "Кодът не беше изпратен.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmTotp = async () => {
    if (!totpPendingToken) {
      return;
    }

    const normalized = totpCode.replace(/\D/g, "");
    if (normalized.length !== 6) {
      Alert.alert("Липсва код", "Въведете 6-цифрения код от Google Authenticator.");
      return;
    }

    try {
      setIsSubmitting(true);
      await completeTotpLogin(totpPendingToken, normalized);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendDeviceEmail = async () => {
    if (!devicePendingToken) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await sendDeviceEmailCodeRequest(devicePendingToken);
      setEmailCodeSent(true);
      setStep("email");
      Alert.alert("Проверете имейла", response.message);
    } catch (error) {
      Alert.alert(
        "Неуспешно изпращане",
        error instanceof Error ? error.message : "Кодът не беше изпратен.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDeviceEmail = async () => {
    if (!devicePendingToken) {
      return;
    }

    const normalized = emailCode.replace(/\D/g, "");
    if (normalized.length !== 6) {
      Alert.alert("Липсва код", "Въведете 6-цифрения код от имейла.");
      return;
    }

    try {
      setIsSubmitting(true);
      await completeDeviceEmailCode(devicePendingToken, normalized);
    } catch (error) {
      Alert.alert(
        "Неуспешен код",
        error instanceof Error ? error.message : "Кодът не беше приет.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const rememberRow = (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rememberButton}
        onPress={() => setRememberMe((current) => !current)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: rememberMe }}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: theme.colors.primary,
              backgroundColor: rememberMe ? theme.colors.primary : "transparent",
            },
          ]}
        >
          {rememberMe ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <View>
          <Text style={[styles.rememberText, { color: theme.colors.text }]}>
            Запомни ме
          </Text>
          <Text
            style={[styles.rememberHint, { color: theme.colors.textSecondary }]}
          >
            {rememberMe ? "Сесия за 1 месец" : "Сесия за 1 ден"}
          </Text>
        </View>
      </TouchableOpacity>

      {step === "password" ? (
        <Link
          href={{
            pathname: "/(auth)/forgot-password",
            params: email.trim() ? { email: email.trim().toLowerCase() } : {},
          }}
          asChild
        >
          <TouchableOpacity>
            <Text style={[styles.forgotText, { color: theme.colors.primary }]}>
              Забравена парола?
            </Text>
          </TouchableOpacity>
        </Link>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <Animated.View style={[styles.animatedContent, { opacity: fadeAnim }]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <Image
            source={require("../../../assets/images/eto-me.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Вход
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              {step === "device"
                ? "Потвърдете новото устройство."
                : step === "methods"
                  ? "Изберете как да влезете от това устройство."
                  : step === "loginEmail"
                    ? "Потвърдете входа с кода от имейла."
                    : "Влезте в своя профил, за да продължите."}
            </Text>

            {step === "methods" ? (
              <View style={styles.methods}>
                <AppButton
                  title="Имейл и парола"
                  onPress={() => setStep("password")}
                />
                {serverHasPin ? (
                  <AppButton
                    title="PIN код на приложението"
                    onPress={() => setStep("pin")}
                  />
                ) : null}
                {canUseFingerprintLogin ? (
                  <BiometricLoginButton
                    label="Вход с отпечатък"
                    loading={isSubmitting}
                    onPress={() => {
                      void (async () => {
                        try {
                          setIsSubmitting(true);
                          await loginWithFingerprint(rememberMe);
                        } catch (error) {
                          handleAuthError(error);
                        } finally {
                          setIsSubmitting(false);
                        }
                      })();
                    }}
                  />
                ) : null}
                {canUseDeviceLockLogin ? (
                  <BiometricLoginButton
                    label="Отключване на телефона"
                    loading={isSubmitting}
                    onPress={() => {
                      void (async () => {
                        try {
                          setIsSubmitting(true);
                          await loginWithDeviceLock(rememberMe);
                        } catch (error) {
                          handleAuthError(error);
                        } finally {
                          setIsSubmitting(false);
                        }
                      })();
                    }}
                  />
                ) : null}
                {rememberRow}
              </View>
            ) : null}

            {step === "password" ? (
              <>
                <AppInput
                  label="Имейл"
                  placeholder="например: name@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onBlur={() => void applyOptions(email.trim().toLowerCase())}
                />
                <AppInput
                  ref={passwordRef}
                  label="Парола"
                  placeholder="Въведете паролата си"
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={() => void handlePasswordLogin()}
                />
                {rememberRow}
                <AppButton
                  title="Вход"
                  loading={isSubmitting}
                  onPress={() => void handlePasswordLogin()}
                />
                {showMethodPicker ? (
                  <TouchableOpacity onPress={() => setStep("methods")}>
                    <Text
                      style={[
                        styles.footerLink,
                        { color: theme.colors.primary, textAlign: "center" },
                      ]}
                    >
                      Други начини за вход
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}

            {step === "pin" ? (
              <>
                <AppInput
                  label="PIN код"
                  placeholder="4 до 6 цифри"
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  isPassword
                />
                {rememberRow}
                <AppButton
                  title="Вход с PIN"
                  loading={isSubmitting}
                  onPress={() => void handlePinLogin()}
                />
                <TouchableOpacity onPress={() => setStep("methods")}>
                  <Text
                    style={[
                      styles.footerLink,
                      { color: theme.colors.textSecondary, textAlign: "center" },
                    ]}
                  >
                    Назад
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {step === "device" ? (
              <View style={styles.totpBox}>
                <FontAwesome
                  name="mobile"
                  size={28}
                  color={theme.colors.primary}
                  style={{ alignSelf: "center" }}
                />
                <Text style={[styles.totpTitle, { color: theme.colors.text }]}>
                  Ново устройство
                </Text>
                <Text
                  style={[styles.totpHint, { color: theme.colors.textSecondary }]}
                >
                  Потвърдете входа от предишното си устройство
                  {deviceName ? ` (${deviceName})` : ""}. Ако нямате достъп до
                  него, изпратете код по имейл.
                </Text>
                <AppButton
                  title="Изпрати код по имейл"
                  loading={isSubmitting}
                  onPress={() => void handleSendDeviceEmail()}
                />
                <TouchableOpacity
                  onPress={() => {
                    setDevicePendingToken(null);
                    setStep(showMethodPicker ? "methods" : "password");
                  }}
                >
                  <Text
                    style={[
                      styles.footerLink,
                      { color: theme.colors.textSecondary, textAlign: "center" },
                    ]}
                  >
                    Отказ
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {step === "email" ? (
              <View style={styles.totpBox}>
                <Text style={[styles.totpTitle, { color: theme.colors.text }]}>
                  Код по имейл
                </Text>
                <Text
                  style={[styles.totpHint, { color: theme.colors.textSecondary }]}
                >
                  {emailCodeSent
                    ? "Въведете 6-цифрения код от имейла."
                    : "Изпратете код към имейла на профила."}
                </Text>
                <AppInput
                  label="Код"
                  placeholder="6 цифри"
                  value={emailCode}
                  onChangeText={setEmailCode}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                />
                <AppButton
                  title="Потвърди"
                  loading={isSubmitting}
                  onPress={() => void handleVerifyDeviceEmail()}
                />
                <TouchableOpacity onPress={() => void handleSendDeviceEmail()}>
                  <Text
                    style={[
                      styles.footerLink,
                      { color: theme.colors.primary, textAlign: "center" },
                    ]}
                  >
                    Изпрати кода отново
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {step === "totp" ? (
              <View style={styles.totpBox}>
                <Text style={[styles.totpTitle, { color: theme.colors.text }]}>
                  Google Authenticator
                </Text>
                <Text
                  style={[styles.totpHint, { color: theme.colors.textSecondary }]}
                >
                  Въведете 6-цифрения код от приложението.
                </Text>
                <AppInput
                  label="Код"
                  placeholder="6 цифри"
                  value={totpCode}
                  onChangeText={setTotpCode}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  autoFocus
                />
                <AppButton
                  title="Продължи"
                  loading={isSubmitting}
                  onPress={() => void handleConfirmTotp()}
                />
                <TouchableOpacity
                  onPress={() => {
                    setTotpPendingToken(null);
                    setTotpCode("");
                    setStep(showMethodPicker ? "methods" : "password");
                  }}
                >
                  <Text
                    style={[
                      styles.footerLink,
                      { color: theme.colors.textSecondary, textAlign: "center" },
                    ]}
                  >
                    Отказ
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {step === "loginEmail" ? (
              <View style={styles.totpBox}>
                <Text style={[styles.totpTitle, { color: theme.colors.text }]}>
                  Код по имейл
                </Text>
                <Text
                  style={[styles.totpHint, { color: theme.colors.textSecondary }]}
                >
                  Изпратихме 6-цифрен код на имейла на профила. Въведете го, за
                  да влезете.
                </Text>
                <AppInput
                  label="Код"
                  placeholder="6 цифри"
                  value={loginEmailCode}
                  onChangeText={setLoginEmailCode}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  autoFocus
                />
                <AppButton
                  title="Продължи"
                  loading={isSubmitting}
                  onPress={() => void handleConfirmEmailLogin()}
                />
                <TouchableOpacity onPress={() => void handleResendLoginEmail()}>
                  <Text
                    style={[
                      styles.footerLink,
                      { color: theme.colors.primary, textAlign: "center" },
                    ]}
                  >
                    Изпрати кода отново
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setLoginEmailPendingToken(null);
                    setLoginEmailCode("");
                    setStep(showMethodPicker ? "methods" : "password");
                  }}
                >
                  <Text
                    style={[
                      styles.footerLink,
                      { color: theme.colors.textSecondary, textAlign: "center" },
                    ]}
                  >
                    Отказ
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {step === "password" || step === "methods" ? (
              <>
                <View style={styles.separator}>
                  <View
                    style={[
                      styles.separatorLine,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                  <Text style={{ color: theme.colors.textSecondary }}>или</Text>
                  <View
                    style={[
                      styles.separatorLine,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                </View>
                <GoogleLoginButton
                  rememberMe={rememberMe}
                  onTotpRequired={(pendingToken) => {
                    fadeIn();
                    setTotpPendingToken(pendingToken);
                    setTotpCode("");
                    setStep("totp");
                  }}
                  onDeviceVerificationRequired={(pendingToken, name) => {
                    fadeIn();
                    setDevicePendingToken(pendingToken);
                    setDeviceName(name);
                    setStep("device");
                  }}
                  onEmailCodeRequired={(pendingToken) => {
                    fadeIn();
                    setLoginEmailPendingToken(pendingToken);
                    setLoginEmailCode("");
                    setStep("loginEmail");
                  }}
                />
              </>
            ) : null}

            <View style={styles.footer}>
              <Text style={{ color: theme.colors.textSecondary }}>
                Нямате профил?{" "}
              </Text>
              <Link
                href={{
                  pathname: "/(auth)/register",
                  params: returnTo ? { returnTo } : {},
                }}
                asChild
              >
                <TouchableOpacity>
                  <Text
                    style={[styles.footerLink, { color: theme.colors.primary }]}
                  >
                    Регистрация
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          <AuthLegalLinks />
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  animatedContent: { flex: 1 },
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 22,
  },
  logo: {
    width: 110,
    height: 110,
    alignSelf: "center",
    marginBottom: 18,
  },
  card: { borderRadius: 22, padding: 22 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center" },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
    marginBottom: 24,
  },
  methods: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    marginBottom: 18,
  },
  rememberButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 14,
  },
  rememberText: { fontWeight: "600", fontSize: 14 },
  rememberHint: { fontSize: 12, marginTop: 2 },
  forgotText: { fontWeight: "600" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
  },
  separatorLine: { flex: 1, height: StyleSheet.hairlineWidth },
  footerLink: { fontWeight: "700", marginTop: 12 },
  totpBox: { gap: 10, marginTop: 8 },
  totpTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  totpHint: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
