import { useAppTheme } from "@/app/_layout";
import AuthLegalLinks from "@/components/auth/auth-legal-links";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import {
  ApiError,
  forgotPasswordRequest,
  resetPasswordRequest,
} from "@/services/auth";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Step = "email" | "code" | "password";

function restrictionMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Възникна неочаквана грешка.";
}

export default function ForgotPasswordScreen() {
  const { theme } = useAppTheme();
  const { email: initialEmail } = useLocalSearchParams<{ email?: string }>();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(
    typeof initialEmail === "string" ? initialEmail : "",
  );
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const passwordConfirmationRef = useRef<TextInput>(null);

  const sendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert("Липсващи данни", "Въведете имейл адрес.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await forgotPasswordRequest(normalizedEmail);
      setEmail(normalizedEmail);
      setStep("code");
      Alert.alert("Проверете имейла", response.message);
    } catch (error) {
      Alert.alert(
        error instanceof ApiError && error.status === 429
          ? "Ограничение"
          : "Неуспешно изпращане",
        restrictionMessage(error),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNewPassword = () => {
    const normalizedCode = code.replace(/\D/g, "");

    if (normalizedCode.length !== 6) {
      Alert.alert("Невалиден код", "Въведете 6-цифрения код от имейла.");
      return;
    }

    setCode(normalizedCode);
    setStep("password");
  };

  const submitNewPassword = async () => {
    if (!password || !passwordConfirmation) {
      Alert.alert("Липсващи данни", "Въведете и потвърдете новата парола.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Невалидна парола", "Паролата трябва да е поне 6 символа.");
      return;
    }

    if (password !== passwordConfirmation) {
      Alert.alert("Грешка", "Паролите не съвпадат.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await resetPasswordRequest({
        email,
        code,
        password,
        passwordConfirmation,
      });
      Alert.alert("Готово", response.message, [
        {
          text: "Към вход",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]);
    } catch (error) {
      Alert.alert(
        error instanceof ApiError && error.status === 429
          ? "Ограничение"
          : "Неуспешна промяна",
        restrictionMessage(error),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    step === "email"
      ? "Забравена парола"
      : step === "code"
        ? "Код от имейла"
        : "Нова парола";

  const subtitle =
    step === "email"
      ? "Въведете имейла на профила. Ако съществува, ще получите код."
      : step === "code"
        ? `Изпратихме код на ${email}. Въведете го тук.`
        : "Изберете нова парола, след което влезте с нея.";

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            {subtitle}
          </Text>

          {step === "email" ? (
            <AppInput
              label="Имейл"
              placeholder="например: name@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="done"
              onSubmitEditing={sendCode}
            />
          ) : null}

          {step === "code" ? (
            <AppInput
              ref={codeRef}
              label="Код"
              placeholder="6 цифри"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete={
                Platform.OS === "android" ? "sms-otp" : "one-time-code"
              }
              autoCorrect={false}
              importantForAutofill="yes"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={goToNewPassword}
            />
          ) : null}

          {step === "password" ? (
            <>
              <AppInput
                ref={passwordRef}
                label="Нова парола"
                placeholder="Поне 6 символа"
                value={password}
                onChangeText={setPassword}
                isPassword
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() =>
                  passwordConfirmationRef.current?.focus()
                }
              />
              <AppInput
                ref={passwordConfirmationRef}
                label="Потвърждение"
                placeholder="Повторете паролата"
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                isPassword
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={submitNewPassword}
              />
            </>
          ) : null}

          <AppButton
            title={
              step === "email"
                ? "Изпрати код"
                : step === "code"
                  ? "Продължи"
                  : "Запази паролата"
            }
            loading={isSubmitting}
            onPress={
              step === "email"
                ? sendCode
                : step === "code"
                  ? goToNewPassword
                  : submitNewPassword
            }
          />

          {step === "code" ? (
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={sendCode}
              disabled={isSubmitting}
            >
              <Text
                style={[styles.secondaryText, { color: theme.colors.primary }]}
              >
                Изпрати кода отново
              </Text>
            </TouchableOpacity>
          ) : null}

          {step !== "email" ? (
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => {
                if (step === "password") {
                  setStep("code");
                  return;
                }

                setStep("email");
              }}
            >
              <Text
                style={[
                  styles.secondaryText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Назад
              </Text>
            </TouchableOpacity>
          ) : (
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.secondaryAction}>
                <Text
                  style={[
                    styles.secondaryText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Към вход
                </Text>
              </TouchableOpacity>
            </Link>
          )}
        </View>

        <AuthLegalLinks />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 22,
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
  secondaryAction: {
    alignSelf: "center",
    marginTop: 18,
  },
  secondaryText: {
    fontWeight: "600",
  },
});
