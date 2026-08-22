import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import DeleteAccountForm from "@/components/profile/delete-account-form";
import { useAuth } from "@/hooks/useAuth";
import { deleteAccountRequest } from "@/services/auth";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

export default function DeleteAccountScreen() {
  const { theme } = useAppTheme();
  const { token, user, disableBiometricLogin, endLocalSession } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!token) {
    return null;
  }

  const handleDelete = async (
    currentPassword: string,
    confirmation: "delete account",
  ) => {
    setIsDeleting(true);
    try {
      await deleteAccountRequest(token, {
        currentPassword,
        confirmation,
      });
      await disableBiometricLogin();
      await endLocalSession();
      return true;
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Профилът не можа да бъде изтрит.",
      );
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Header title="Изтриване на профила" hideSearchButton hideAuthButton />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <DeleteAccountForm
          isDeleting={isDeleting}
          requiresPassword={user?.has_password !== false}
          onDelete={handleDelete}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
});
