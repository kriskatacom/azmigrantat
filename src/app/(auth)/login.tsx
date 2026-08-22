import { useAppTheme } from "@/app/_layout";
import AuthLegalLinks from "@/components/auth/auth-legal-links";
import BiometricLoginButton from "@/components/auth/biometric-login-button";
import GoogleLoginButton from "@/components/auth/google-login-button";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import { useAuth } from "@/hooks/useAuth";
import { TotpRequiredError } from "@/services/auth";
import { getBiometricCredentials } from "@/services/biometric";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const { login, loginWithBiometrics, completeTotpLogin, canUseBiometricLogin, biometricLabel } =
    useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBiometricSubmitting, setIsBiometricSubmitting] = useState(false);
  const [totpPendingToken, setTotpPendingToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [isTotpSubmitting, setIsTotpSubmitting] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

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

  const handleBiometricLogin = async () => {
    try {
      setIsBiometricSubmitting(true);
      await loginWithBiometrics(rememberMe);
    } catch (error) {
      fadeIn();

      if (error instanceof TotpRequiredError) {
        setTotpPendingToken(error.pendingToken);
        setTotpCode("");
        return;
      }

      const message =
        error instanceof Error ? error.message : "Възникна неочаквана грешка.";

      if (message !== "Биометричното потвърждение беше отказано.") {
        Alert.alert("Неуспешен вход", message);
      }
    } finally {
      setIsBiometricSubmitting(false);
    }
  };

  useEffect(() => {
    void getBiometricCredentials().then((credentials) => {
      if (credentials?.email) {
        setEmail((current) => current || credentials.email);
      }
    });
  }, []);

  const handleLogin = async () => {
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
      fadeIn();

      if (error instanceof TotpRequiredError) {
        setTotpPendingToken(error.pendingToken);
        setTotpCode("");
        return;
      }

      Alert.alert(
        "Неуспешен вход",
        error instanceof Error ? error.message : "Възникна неочаквана грешка.",
      );

      console.log(error);
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
      setIsTotpSubmitting(true);
      await completeTotpLogin(totpPendingToken, normalized);
    } catch (error) {
      Alert.alert(
        "Неуспешен код",
        error instanceof Error ? error.message : "Кодът не беше приет.",
      );
    } finally {
      setIsTotpSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <Animated.View
        style={[
          styles.animatedContent,
          {
            opacity: fadeAnim,
          },
        ]}
      >
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
              Влезте в своя профил, за да продължите.
            </Text>

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
              onSubmitEditing={handleLogin}
            />

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
                      backgroundColor: rememberMe
                        ? theme.colors.primary
                        : "transparent",
                    },
                  ]}
                >
                  {rememberMe ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : null}
                </View>
                <View>
                  <Text
                    style={[styles.rememberText, { color: theme.colors.text }]}
                  >
                    Запомни ме
                  </Text>
                  <Text
                    style={[
                      styles.rememberHint,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {rememberMe ? "Сесия за 1 месец" : "Сесия за 1 ден"}
                  </Text>
                </View>
              </TouchableOpacity>

              <Link
                href={{
                  pathname: "/(auth)/forgot-password",
                  params: email.trim()
                    ? { email: email.trim().toLowerCase() }
                    : {},
                }}
                asChild
              >
                <TouchableOpacity>
                  <Text
                    style={[styles.forgotText, { color: theme.colors.primary }]}
                  >
                    Забравена парола?
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            <AppButton
              title="Вход"
              loading={isSubmitting}
              disabled={isBiometricSubmitting}
              onPress={handleLogin}
            />

            {canUseBiometricLogin ? (
              <BiometricLoginButton
                label={`Вход с ${biometricLabel}`}
                loading={isBiometricSubmitting}
                onPress={() => void handleBiometricLogin()}
              />
            ) : null}

            <View style={styles.separator}>
              <View
                style={[styles.separatorLine, { backgroundColor: theme.colors.border }]}
              />
              <Text style={{ color: theme.colors.textSecondary }}>или</Text>
              <View
                style={[styles.separatorLine, { backgroundColor: theme.colors.border }]}
              />
            </View>

            <GoogleLoginButton
              rememberMe={rememberMe}
              onTotpRequired={(pendingToken) => {
                fadeIn();
                setTotpPendingToken(pendingToken);
                setTotpCode("");
              }}
            />

            {totpPendingToken ? (
              <View style={styles.totpBox}>
                <Text style={[styles.totpTitle, { color: theme.colors.text }]}>
                  Google Authenticator
                </Text>
                <Text
                  style={[
                    styles.totpHint,
                    { color: theme.colors.textSecondary },
                  ]}
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
                  loading={isTotpSubmitting}
                  onPress={() => void handleConfirmTotp()}
                />
                <TouchableOpacity
                  onPress={() => {
                    setTotpPendingToken(null);
                    setTotpCode("");
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
  animatedContent: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
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
  card: {
    borderRadius: 22,
    padding: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
    marginBottom: 24,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: -4,
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
  rememberText: {
    fontWeight: "600",
    fontSize: 14,
  },
  rememberHint: {
    fontSize: 12,
    marginTop: 2,
  },
  forgotText: {
    fontWeight: "600",
  },
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
  footerLink: {
    fontWeight: "700",
  },
  totpBox: {
    gap: 10,
    marginTop: 8,
  },
  totpTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  totpHint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
