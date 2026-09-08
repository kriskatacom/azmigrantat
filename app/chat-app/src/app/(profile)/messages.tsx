import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import DeleteChatMessagesForm from "@/components/profile/delete-chat-messages-form";
import { useAuth } from "@/hooks/useAuth";
import { deleteChatMessagesRequest } from "@/services/auth";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

export default function DeleteMessagesScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!token) {
    return null;
  }

  const handleDelete = async (
    currentPassword: string,
    confirmation: "delete chat",
  ) => {
    setIsDeleting(true);
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
      setIsDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Header title="Изтриване на съобщения" hideSearchButton hideAuthButton />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <DeleteChatMessagesForm
          isDeleting={isDeleting}
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
