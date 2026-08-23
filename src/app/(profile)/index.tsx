import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import ProfileIdentityCard from "@/components/profile/profile-identity-card";
import ProfileNavRow from "@/components/profile/profile-nav-row";
import { PRIVACY_URL, TERMS_URL } from "@/constants/legal";
import { phoneDisplayParts } from "@/constants/european-dial-codes";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentUserRequest } from "@/services/auth";
import { updateProfileImageRequest } from "@/services/profile";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileHomeScreen() {
  const { theme } = useAppTheme();
  const { user, token, updateUser, logout } = useAuth();
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

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <Header title="Моят профил" hideSearchButton hideAuthButton />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <ProfileNavRow
          href={{
            pathname: "/user/[id]",
            params: { id: String(user.id) },
          }}
          icon="id-card"
          title="Публичен профил"
          description="Как виждат профила ви другите потребители"
        />
        <ProfileNavRow
          href="/(profile)/personal"
          icon="user"
          title="Лични данни"
          description="Име, пол и биография"
        />
        <ProfileNavRow
          href="/(profile)/contact"
          icon="map-marker"
          title="Контакт и адрес"
          description="Телефон, държава, град и адрес"
        />
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 44, gap: 18 },
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
