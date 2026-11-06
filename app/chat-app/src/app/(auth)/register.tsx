import { useAppTheme } from "@/app/_layout";
import AuthHero from "@/components/auth/auth-hero";
import AuthLegalLinks from "@/components/auth/auth-legal-links";
import GoogleLoginButton from "@/components/auth/google-login-button";
import FacebookLoginButton from "@/components/auth/facebook-login-button";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import {
  AUTH_ELEMENT_GAP,
  AUTH_HORIZONTAL_PADDING,
  AUTH_VERTICAL_PADDING,
} from "@/constants/auth-layout";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegisterScreen() {
  const { theme } = useAppTheme();
  const { register } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const passwordConfirmationRef = useRef<TextInput>(null);

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

  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !normalizedEmail ||
      !password ||
      !passwordConfirmation
    ) {
      Alert.alert("Липсващи данни", "Попълнете всички полета.");
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

      await fadeOut();

      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password,
        passwordConfirmation,
      });
    } catch (error) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      Alert.alert(
        "Неуспешна регистрация",
        error instanceof Error ? error.message : "Възникна неочаквана грешка.",
      );

      console.log(error);
    } finally {
      setIsSubmitting(false);
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
          <View style={styles.page}>
            <AuthHero
              title="Регистрация"
              subtitle="Създайте своя профил в приложението."
            />
            <View style={[styles.card, { backgroundColor: theme.colors.card }]}>

            <AppInput
              containerStyle={styles.authInput}
              label="Име"
              placeholder="Вашето име"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />

            <AppInput
              containerStyle={styles.authInput}
              ref={lastNameRef}
              label="Фамилия"
              placeholder="Вашата фамилия"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              textContentType="familyName"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <AppInput
              containerStyle={styles.authInput}
              ref={emailRef}
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
              containerStyle={styles.authInput}
              ref={passwordRef}
              label="Парола"
              placeholder="Поне 6 символа"
              value={password}
              onChangeText={setPassword}
              isPassword
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => passwordConfirmationRef.current?.focus()}
            />

            <AppInput
              containerStyle={styles.authInput}
              ref={passwordConfirmationRef}
              label="Потвърди паролата"
              placeholder="Въведете паролата отново"
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              isPassword
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />

            <AppButton
              title="Създай профил"
              loading={isSubmitting}
              onPress={handleRegister}
            />

            <View style={styles.separator}>
              <View
                style={[styles.separatorLine, { backgroundColor: theme.colors.border }]}
              />
              <Text style={{ color: theme.colors.textSecondary }}>или</Text>
              <View
                style={[styles.separatorLine, { backgroundColor: theme.colors.border }]}
              />
            </View>

            <GoogleLoginButton rememberMe />
            <FacebookLoginButton rememberMe />

            <View style={styles.footer}>
              <Text style={{ color: theme.colors.textSecondary }}>
                Вече имате профил?{" "}
              </Text>

              <Link
                href={{
                  pathname: "/(auth)/login",
                  params: returnTo ? { returnTo } : {},
                }}
                asChild
              >
                <TouchableOpacity>
                  <Text
                    style={[styles.footerLink, { color: theme.colors.primary }]}
                  >
                    Вход
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
            <AuthLegalLinks preface="Създавайки профил, приемате" />
            </View>
          </View>
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
    padding: 0,
  },
  page: { flexGrow: 1 },
  card: {
    flexGrow: 1,
    borderRadius: 0,
    paddingHorizontal: AUTH_HORIZONTAL_PADDING,
    paddingTop: AUTH_ELEMENT_GAP,
    paddingBottom: AUTH_VERTICAL_PADDING,
    gap: AUTH_ELEMENT_GAP,
  },
  authInput: { marginBottom: 0 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  separatorLine: { flex: 1, height: StyleSheet.hairlineWidth },
  footerLink: {
    fontWeight: "700",
  },
});
