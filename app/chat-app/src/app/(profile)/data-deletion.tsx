import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import ProfileNavRow from "@/components/profile/profile-nav-row";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function DataDeletionScreen() {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title="Изтриване на данни" hideSearchButton hideAuthButton />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Изберете кои данни искате да премахнете. Всяко действие изисква
          допълнително потвърждение.
        </Text>
        <ProfileNavRow
          href="/(profile)/messages"
          icon="comments"
          title="Изтриване на съобщения"
          description="Премахване на цялата чат история"
        />
        <ProfileNavRow
          href="/(profile)/delete-videos"
          icon="video-camera"
          title="Изтриване на видеоклипове"
          description="Премахване на всички видеоклипове от профила"
        />
        <ProfileNavRow
          href="/(profile)/delete-account"
          icon="user-times"
          title="Изтриване на профила"
          description="Деактивиране на акаунта завинаги"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 18 },
  description: { fontSize: 14, lineHeight: 20 },
});
