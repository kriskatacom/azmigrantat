import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import ProfileDetailsForm from "@/components/profile/profile-details-form";
import ProfileIdentityCard from "@/components/profile/profile-identity-card";
import ProfileNavRow from "@/components/profile/profile-nav-row";
import { PRIVACY_URL, TERMS_URL } from "@/constants/legal";
import { phoneDisplayParts } from "@/constants/european-dial-codes";
import { useAuth } from "@/hooks/useAuth";
import {
  getCurrentUserRequest,
  updateProfileRequest,
} from "@/services/auth";
import { updateProfileImageRequest } from "@/services/profile";
import type { UpdateProfilePayload } from "@/types/auth";
import { useEffect, useState } from "react";
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

export default function ProfileHomeScreen() {
  const { theme } = useAppTheme();
  const { user, token, updateUser, logout } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!token || user?.public_code) {
      return;
    }

    void getCurrentUserRequest(token)
      .then((freshUser) => updateUser(freshUser))
      .catch(() => undefined);
  }, [token, user?.public_code, updateUser]);

  if (!user || !token) return null;

  const handleChangePhoto = async (file: {
    uri: string;
    name: string;
    mimeType: string;
  }) => {
    setIsUploadingPhoto(true);
    try {
      const updatedUser = await updateProfileImageRequest(token, file);
      await updateUser(updatedUser);
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Профилната снимка не можа да бъде обновена.",
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

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
      <Header title="Моят профил" hideSearchButton hideAuthButton />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <ProfileNavRow
          href="/(profile)/settings"
          icon="cog"
          title="Настройки"
          description="Известия, вибрация и други предпочитания"
        />
        <ProfileNavRow
          href="/(profile)/security"
          icon="lock"
          title="Сигурност"
          description="Парола, биометрия и начин на вход"
        />
        <ProfileNavRow
          href="/(profile)/payments"
          icon="credit-card"
          title="Плащания"
          description="Сканиране и запазване на карти"
        />
        <ProfileNavRow
          href="/(profile)/blocked"
          icon="ban"
          title="Блокирани потребители"
          description="Блокиране по код, преглед и отблокиране"
        />
        <ProfileNavRow
          href="/(profile)/phone"
          icon="phone"
          title="Потвърждение на телефона"
          description={
            user.phone_verified
              ? phoneDisplayParts(user.phone ?? "").display || "Номерът е потвърден"
              : "Код по WhatsApp или SMS"
          }
        />
        <ProfileNavRow
          href="/(profile)/messages"
          icon="comments"
          title="Изтриване на съобщения"
          description="Премахване на цялата чат история"
        />
        <ProfileNavRow
          href="/(profile)/delete-account"
          icon="trash"
          title="Изтриване на профила"
          description="Деактивиране на акаунта завинаги"
        />

        <ProfileIdentityCard
          name={`${user.firstName} ${user.lastName}`.trim() || user.email}
          publicCode={user.public_code}
          imageUri={user.profile_image ?? user.avatar}
          isUploading={isUploadingPhoto}
          onPickImage={handleChangePhoto}
        />

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
