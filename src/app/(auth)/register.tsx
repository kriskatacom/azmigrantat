import { useAppTheme } from "@/app/_layout";
import GoogleLoginButton from "@/components/auth/google-login-button";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
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
          <Image
            source={require("../../../assets/images/eto-me.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Регистрация
            </Text>

            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              Създайте своя профил в приложението.
            </Text>

            <AppInput
              label="Име"
              placeholder="Вашето име"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />

            <AppInput
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

            <GoogleLoginButton />

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
    justifyContent: "center",
    padding: 22,
    paddingVertical: 42,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: 16,
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
});
