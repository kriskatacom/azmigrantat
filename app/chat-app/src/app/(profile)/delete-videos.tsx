import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/hooks/useAuth";
import { deleteAllVideos } from "@/services/videos";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function DeleteVideosScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!token) return null;

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsConfirming(false);
    setIsDeleting(true);
    try {
      const response = await deleteAllVideos(token);
      const { deleted, failed } = response.data;
      Alert.alert(
        failed > 0 ? "Частично завършено" : "Готово",
        failed > 0
          ? `Изтрити видеоклипове: ${deleted}. Неуспешни: ${failed}.`
          : `Изтрити видеоклипове: ${deleted}.`,
      );
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Видеоклиповете не можаха да бъдат изтрити.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title="Изтриване на видеоклипове" hideSearchButton hideAuthButton />
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.dangerCard,
            { backgroundColor: theme.colors.input, borderColor: theme.colors.danger },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.danger }]}>
            Изтриване на всички видеоклипове
          </Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Всички видеоклипове ще бъдат премахнати завинаги от профила и от
            хранилището. Това действие не може да бъде отменено.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: isDeleting }}
            activeOpacity={0.8}
            disabled={isDeleting}
            onPress={() => setIsConfirming(true)}
            style={[
              styles.deleteButton,
              { backgroundColor: theme.colors.danger },
              isDeleting && styles.disabled,
            ]}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.deleteButtonText}>Изтрий всички видеоклипове</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ConfirmModal
        visible={isConfirming}
        title="Изтриване на всички видеоклипове"
        message="Сигурни ли сте? Всички видеоклипове ще бъдат изтрити завинаги."
        confirmText="Изтрий всички"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setIsConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  dangerCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 },
  title: { fontSize: 20, fontWeight: "800" },
  description: { fontSize: 14, lineHeight: 20 },
  deleteButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  deleteButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.45 },
});
