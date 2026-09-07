import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import ProfileDetailsForm from "@/components/profile/profile-details-form";
import { useAuth } from "@/hooks/useAuth";
import { updateProfileRequest } from "@/services/auth";
import type { UpdateProfilePayload } from "@/types/auth";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

export default function ContactDetailsScreen() {
  const { theme } = useAppTheme();
  const { user, token, updateUser } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  if (!user || !token) {
    return null;
  }

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

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <Header title="Контакт и адрес" hideSearchButton hideAuthButton />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Телефон, държава, град и физически адрес. Промяната на номера премахва
          потвърждението му.
        </Text>
        <ProfileDetailsForm
          user={user}
          section="contact"
          isSaving={isSavingProfile}
          onSave={handleSaveProfile}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 44, gap: 18 },
  description: { fontSize: 14, lineHeight: 20 },
});
