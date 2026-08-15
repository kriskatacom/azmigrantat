import { useAppTheme } from "@/app/_layout";
import ProfileField from "@/components/profile/profile-field";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const REQUIRED_CONFIRMATION = "delete chat";

interface DeleteChatMessagesFormProps {
  isDeleting: boolean;
  onDelete: (
    currentPassword: string,
    confirmation: "delete chat",
  ) => Promise<boolean>;
}

export default function DeleteChatMessagesForm({
  isDeleting,
  onDelete,
}: DeleteChatMessagesFormProps) {
  const { theme } = useAppTheme();
  const [confirmation, setConfirmation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const isFormValid =
    confirmation.trim() === REQUIRED_CONFIRMATION &&
    currentPassword.length > 0;

  const deleteMessages = async () => {
    if (!isFormValid || isDeleting) return;

    const didDelete = await onDelete(currentPassword, REQUIRED_CONFIRMATION);

    if (didDelete) {
      setConfirmation("");
      setCurrentPassword("");
    }
  };

  const showFinalConfirmation = () => {
    Alert.alert(
      "Последно потвърждение",
      "Всички ваши изпратени и получени чат съобщения ще бъдат изтрити завинаги. Операцията не може да бъде отменена.",
      [
        { text: "Отказ", style: "cancel" },
        {
          text: "Изтрий завинаги",
          style: "destructive",
          onPress: () => void deleteMessages(),
        },
      ],
    );
  };

  const requestDeletion = () => {
    if (!isFormValid || isDeleting) return;

    Alert.alert(
      "Изтриване на чат съобщенията",
      "Сигурни ли сте, че искате да продължите? Това ще премахне цялата ви чат история.",
      [
        { text: "Отказ", style: "cancel" },
        {
          text: "Продължи",
          style: "destructive",
          onPress: showFinalConfirmation,
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.input,
          borderColor: theme.colors.danger,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.danger }]}>Опасна зона</Text>
      <Text
        style={[styles.description, { color: theme.colors.textSecondary }]}
      >
        Изтриването премахва завинаги всички ваши изпратени и получени чат
        съобщения. За потвърждение напишете точно „delete chat“ и въведете
        текущата си парола.
      </Text>

      <ProfileField
        label='Напишете "delete chat"'
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isDeleting}
        placeholder="delete chat"
      />
      <ProfileField
        label="Текуща парола"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isDeleting}
        placeholder="Въведете текущата си парола"
      />

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: !isFormValid || isDeleting }}
        activeOpacity={0.8}
        disabled={!isFormValid || isDeleting}
        onPress={requestDeletion}
        style={[
          styles.deleteButton,
          { backgroundColor: theme.colors.danger },
          (!isFormValid || isDeleting) && styles.disabled,
        ]}
      >
        {isDeleting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.deleteButtonText}>Изтрий чат съобщенията</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
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
