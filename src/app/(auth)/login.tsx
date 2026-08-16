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

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const { login } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      });
    } catch (error) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      Alert.alert(
        "Неуспешен вход",
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
            source={require("../../../assets/images/azmigrantat-logo.webp")}
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

            <TouchableOpacity style={styles.forgotButton}>
              <Text
                style={[styles.forgotText, { color: theme.colors.primary }]}
              >
                Забравена парола?
              </Text>
            </TouchableOpacity>

            <AppButton
              title="Вход"
              loading={isSubmitting}
              onPress={handleLogin}
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
});
