import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import DeleteChatMessagesForm from "@/components/profile/delete-chat-messages-form";
import PasswordForm from "@/components/profile/password-form";
import ProfileDetailsForm from "@/components/profile/profile-details-form";
import { useAuth } from "@/hooks/useAuth";
import {
  changePasswordRequest,
  deleteChatMessagesRequest,
  updateProfileRequest,
} from "@/services/auth";
import type { UpdateProfilePayload } from "@/types/auth";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const TERMS_URL = "https://example.com/terms";
const PRIVACY_URL = "https://example.com/privacy";

export default function ProfileHomeScreen() {
  const { theme } = useAppTheme();
  const { user, token, updateUser, logout } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDeletingChatMessages, setIsDeletingChatMessages] = useState(false);

  if (!user || !token) return null;

  const handleSaveProfile = async (payload: UpdateProfilePayload) => {
    setIsSavingProfile(true);
    try {
      const updatedUser = await updateProfileRequest(token, payload);
      await updateUser(updatedUser);
      Alert.alert("Готово", "Профилът беше обновен успешно.");
    } catch (error) {
      console.log(error);

      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Профилът не можа да бъде обновен.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (
    currentPassword: string,
    password: string,
    passwordConfirmation: string,
  ) => {
    setIsSavingPassword(true);
    try {
      await changePasswordRequest(token, {
        currentPassword,
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

  const handleDeleteChatMessages = async (
    currentPassword: string,
    confirmation: "delete chat",
  ) => {
    setIsDeletingChatMessages(true);
    try {
      const deletedCount = await deleteChatMessagesRequest(token, {
        currentPassword,
        confirmation,
      });
      Alert.alert(
        "Готово",
        deletedCount === undefined
          ? "Чат съобщенията бяха изтрити завинаги."
          : `Изтрити чат съобщения: ${deletedCount}.`,
      );
      return true;
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Чат съобщенията не могат да бъдат изтрити.",
      );
      return false;
    } finally {
      setIsDeletingChatMessages(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <Header title="Моят профил" hideSearchButton hideAuthButton />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View style={styles.intro}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Лични данни
          </Text>
          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
          >
            Прегледайте и актуализирайте информацията в профила си.
          </Text>
        </View>
        <ProfileDetailsForm
          user={user}
          isSaving={isSavingProfile}
          onSave={handleSaveProfile}
        />

        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.intro}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Сигурност
          </Text>
          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
          >
            Новата парола трябва да съдържа поне 8 символа.
          </Text>
        </View>
        <PasswordForm
          isSaving={isSavingPassword}
          onSave={handleChangePassword}
        />

        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <DeleteChatMessagesForm
          isDeleting={isDeletingChatMessages}
          onDelete={handleDeleteChatMessages}
        />

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => void Linking.openURL(TERMS_URL)}>
            <Text
              style={[styles.link, { color: theme.colors.primary }]}
            >
              Общи условия
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void Linking.openURL(PRIVACY_URL)}>
            <Text
              style={[styles.link, { color: theme.colors.primary }]}
            >
              Политика за поверителност
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => void logout()}
          style={[styles.logout, { borderColor: theme.colors.danger }]}
        >
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            Изход
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 44, gap: 18 },
  intro: { gap: 5 },
  title: { fontSize: 22, fontWeight: "800" },
  description: { fontSize: 14, lineHeight: 20 },
  divider: { height: 1, marginVertical: 10 },
  legalLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: 10,
  },
  link: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  logout: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
});
