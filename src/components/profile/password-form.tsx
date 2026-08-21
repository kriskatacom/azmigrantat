import AppButton from "@/components/ui/AppButton";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import ProfileField from "./profile-field";

interface PasswordFormProps {
  isSaving: boolean;
  requireCurrentPassword?: boolean;
  onSave: (
    currentPassword: string | null,
    password: string,
    passwordConfirmation: string,
  ) => Promise<boolean>;
}

export default function PasswordForm({
  isSaving,
  requireCurrentPassword = true,
  onSave,
}: PasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const canSave =
    password.length >= 8 &&
    password === passwordConfirmation &&
    (!requireCurrentPassword || currentPassword.length > 0);

  const handleSave = async () => {
    const didSave = await onSave(
      requireCurrentPassword ? currentPassword : null,
      password,
      passwordConfirmation,
    );

    if (didSave) {
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
    }
  };

  return (
    <View style={styles.form}>
      {requireCurrentPassword ? (
        <ProfileField
          label="Текуща парола"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoComplete="current-password"
        />
      ) : null}
      <ProfileField
        label="Нова парола"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <ProfileField
        label="Повтори новата парола"
        value={passwordConfirmation}
        onChangeText={setPasswordConfirmation}
        secureTextEntry
        autoComplete="new-password"
      />
      <AppButton
        title={
          requireCurrentPassword
            ? "Смени паролата"
            : "Потвърди с телефона и смени"
        }
        loading={isSaving}
        disabled={!canSave}
        onPress={() => void handleSave()}
      />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 18 } });
