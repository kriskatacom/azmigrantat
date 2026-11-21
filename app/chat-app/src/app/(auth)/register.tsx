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
import { completeRegistrationPlanChoiceRequest } from "@/services/auth";
import { createSubscriptionCheckout } from "@/services/payments";
import type { AuthResponse } from "@/types/auth";
import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type RegistrationPlan = "free" | "paid";

export default function RegisterScreen() {
  const { theme } = useAppTheme();
  const { register, completeAuthResponse } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planPickerVisible, setPlanPickerVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<RegistrationPlan>("free");
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState<AuthResponse | null>(null);

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

  const validateRegistration = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !normalizedEmail ||
      !password ||
      !passwordConfirmation
    ) {
      Alert.alert("Липсващи данни", "Попълнете всички полета.");
      return null;
    }

    if (password.length < 6) {
      Alert.alert("Невалидна парола", "Паролата трябва да е поне 6 символа.");
      return null;
    }

    if (password !== passwordConfirmation) {
      Alert.alert("Грешка", "Паролите не съвпадат.");
      return null;
    }

    return normalizedEmail;
  };

  const handleRegister = () => {
    if (!validateRegistration()) return;
    setSelectedPlan("free");
    setPlanPickerVisible(true);
  };

  const submitRegistration = async () => {
    const googleResponse = pendingGoogleAuth;
    const normalizedEmail = googleResponse ? null : validateRegistration();
    if ((!googleResponse && !normalizedEmail) || isSubmitting) return;

    let profileCreated = false;
    let response: AuthResponse | null = googleResponse;
    let sessionPersisted = false;

    try {
      setIsSubmitting(true);
      setPlanPickerVisible(false);

      await fadeOut();

      if (!response) {
        response = await register({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail as string,
          password,
          passwordConfirmation,
        }, false);
      }
      profileCreated = true;

      let checkoutUrl: string | null = null;
      if (selectedPlan === "paid") {
        checkoutUrl = await createSubscriptionCheckout(response.token, "paid");
        if (!checkoutUrl.startsWith("https://business.azmigrantat.com/subscriptions/start?token=")) {
          throw new Error("Получен е невалиден адрес за плащане.");
        }
      }

      if (googleResponse) {
        await completeRegistrationPlanChoiceRequest(response.token, selectedPlan);
      }

      await completeAuthResponse(response);
      sessionPersisted = true;
      setPendingGoogleAuth(null);

      if (checkoutUrl) await Linking.openURL(checkoutUrl);
    } catch (error) {
      if (response && !sessionPersisted) {
        try {
          await completeAuthResponse(response);
          sessionPersisted = true;
          setPendingGoogleAuth(null);
        } catch (sessionError) {
          console.error("Профилът е създаден, но локалната сесия не можа да бъде записана:", sessionError);
        }
      }
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      Alert.alert(
        profileCreated ? "Профилът е създаден" : "Неуспешна регистрация",
        profileCreated
          ? `Профилът е записан, но плащането не можа да стартира. Можете да активирате платения план по-късно от „Абонаментни планове“.${error instanceof Error ? `\n\n${error.message}` : ""}`
          : error instanceof Error ? error.message : "Възникна неочаквана грешка.",
      );

      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuthenticated = async (response: AuthResponse) => {
    if (!response.requiresPlanChoice && !response.isNewUser) {
      await completeAuthResponse(response);
      return;
    }
    setPendingGoogleAuth(response);
    setSelectedPlan("free");
    setPlanPickerVisible(true);
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

            <GoogleLoginButton rememberMe deferSession onAuthenticated={handleGoogleAuthenticated} />
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

      <Modal
        visible={planPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!isSubmitting && !pendingGoogleAuth) setPlanPickerVisible(false); }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.planModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.planTitle, { color: theme.colors.text }]}>Изберете абонамент</Text>
            <Text style={[styles.planSubtitle, { color: theme.colors.textSecondary }]}>Безплатният план е избран по подразбиране.</Text>

            <Pressable
              style={[
                styles.planOption,
                { borderColor: selectedPlan === "free" ? theme.colors.primary : theme.colors.border },
                selectedPlan === "free" && styles.freePlanSelected,
              ]}
              onPress={() => setSelectedPlan("free")}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedPlan === "free" }}
            >
              <Ionicons name="person-outline" size={27} color={theme.colors.primary} />
              <View style={styles.planCopy}>
                <Text style={[styles.planName, { color: theme.colors.text }]}>Безплатен план</Text>
                <Text style={[styles.planDescription, { color: theme.colors.textSecondary }]}>Създавате профила и продължавате без плащане.</Text>
              </View>
              <Ionicons
                name={selectedPlan === "free" ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={theme.colors.primary}
              />
            </Pressable>

            <Pressable
              style={[
                styles.planOption,
                styles.paidPlan,
                { borderColor: selectedPlan === "paid" ? "#D7A400" : theme.colors.border },
                selectedPlan === "paid" && styles.paidPlanSelected,
              ]}
              onPress={() => setSelectedPlan("paid")}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedPlan === "paid" }}
            >
              <Ionicons name="diamond-outline" size={27} color="#D7A400" />
              <View style={styles.planCopy}>
                <Text style={[styles.planName, { color: theme.colors.text }]}>Платен план</Text>
                <Text style={[styles.planDescription, { color: theme.colors.textSecondary }]}>30-дневен достъп. Цената се показва преди плащането.</Text>
              </View>
              <Ionicons
                name={selectedPlan === "paid" ? "radio-button-on" : "radio-button-off"}
                size={24}
                color="#D7A400"
              />
            </Pressable>

            <AppButton
              title={pendingGoogleAuth
                ? selectedPlan === "paid" ? "Продължи към плащане" : "Продължи с безплатен план"
                : selectedPlan === "paid" ? "Създай профил и плати" : "Създай безплатен профил"}
              loading={isSubmitting}
              onPress={submitRegistration}
            />
            {!pendingGoogleAuth ? (
              <Pressable
                style={styles.cancelPlanButton}
                disabled={isSubmitting}
                onPress={() => setPlanPickerVisible(false)}
              >
                <Text style={[styles.cancelPlanText, { color: theme.colors.textSecondary }]}>Назад</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  planModal: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    padding: 22,
    borderRadius: 24,
    gap: 14,
  },
  planTitle: { fontSize: 24, lineHeight: 30, fontWeight: "900", textAlign: "center" },
  planSubtitle: { fontSize: 15, lineHeight: 21, textAlign: "center", marginBottom: 4 },
  planOption: {
    minHeight: 96,
    padding: 16,
    borderWidth: 2,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  freePlanSelected: { backgroundColor: "rgba(59,130,246,0.10)" },
  paidPlan: { backgroundColor: "rgba(215,164,0,0.05)" },
  paidPlanSelected: { backgroundColor: "rgba(215,164,0,0.14)" },
  planCopy: { flex: 1, gap: 4 },
  planName: { fontSize: 18, lineHeight: 23, fontWeight: "800" },
  planDescription: { fontSize: 14, lineHeight: 20 },
  cancelPlanButton: { alignItems: "center", paddingVertical: 8 },
  cancelPlanText: { fontSize: 16, fontWeight: "700" },
});
