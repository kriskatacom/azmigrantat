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

const REQUIRED_CONFIRMATION = "delete account";

interface DeleteAccountFormProps {
  isDeleting: boolean;
  requiresPassword: boolean;
  onDelete: (
    currentPassword: string,
    confirmation: "delete account",
  ) => Promise<boolean>;
}

export default function DeleteAccountForm({
  isDeleting,
  requiresPassword,
  onDelete,
}: DeleteAccountFormProps) {
  const { theme } = useAppTheme();
  const [confirmation, setConfirmation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const isFormValid =
    confirmation.trim() === REQUIRED_CONFIRMATION &&
    (!requiresPassword || currentPassword.length > 0);

  const deleteAccount = async () => {
    if (!isFormValid || isDeleting) {
      return;
    }

    const didDelete = await onDelete(currentPassword, REQUIRED_CONFIRMATION);

    if (didDelete) {
      setConfirmation("");
      setCurrentPassword("");
    }
  };

  const showFinalConfirmation = () => {
    Alert.alert(
      "Последно потвърждение",
      "Профилът, чат съобщенията и запазените данни ще бъдат изтрити. Това не може да се отмени.",
      [
        { text: "Отказ", style: "cancel" },
        {
          text: "Изтрий профила",
          style: "destructive",
          onPress: () => void deleteAccount(),
        },
      ],
    );
  };

  const requestDeletion = () => {
    if (!isFormValid || isDeleting) {
      return;
    }

    Alert.alert(
      "Изтриване на профила",
      "Сигурни ли сте? Ще изгубите достъп до акаунта и чатовете.",
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
      <Text style={[styles.title, { color: theme.colors.danger }]}>
        Изтриване на профила
      </Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Профилът се деактивира завинаги. Напишете точно „delete account“
        {requiresPassword ? " и въведете текущата парола" : ""}.
      </Text>

      <ProfileField
        label='Напишете "delete account"'
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isDeleting}
        placeholder="delete account"
      />
      {requiresPassword ? (
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
      ) : null}

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
          <Text style={styles.deleteButtonText}>Изтрий профила</Text>
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
