import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import PhoneVerificationForm from "@/components/profile/phone-verification-form";
import { useAuth } from "@/hooks/useAuth";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";

export default function PhoneVerificationScreen() {
  const { theme } = useAppTheme();
  const { user, token, updateUser } = useAuth();

  if (!user || !token) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Header title="Потвърждение на телефона" hideSearchButton hideAuthButton />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Изпращаме 6-цифрен код по WhatsApp или SMS. Избери държавата и въведи
          само номера, без кода и без водеща нула.
        </Text>
        <PhoneVerificationForm
          token={token}
          phone={user.phone ?? ""}
          isVerified={user.phone_verified === true}
          onVerified={updateUser}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  description: { fontSize: 14, lineHeight: 20 },
});
