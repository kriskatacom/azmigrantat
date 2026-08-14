import AppButton from "@/components/ui/AppButton";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import ProfileField from "./profile-field";

interface PasswordFormProps {
  isSaving: boolean;
  onSave: (currentPassword: string, password: string, passwordConfirmation: string) => Promise<boolean>;
}

export default function PasswordForm({ isSaving, onSave }: PasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const canSave = currentPassword.length > 0 && password.length >= 8 && password === passwordConfirmation;

  const handleSave = async () => {
    if (await onSave(currentPassword, password, passwordConfirmation)) {
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
    }
  };

  return (
    <View style={styles.form}>
      <ProfileField label="Текуща парола" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="current-password" />
      <ProfileField label="Нова парола" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <ProfileField label="Повтори новата парола" value={passwordConfirmation} onChangeText={setPasswordConfirmation} secureTextEntry autoComplete="new-password" />
      <AppButton title="Смени паролата" loading={isSaving} disabled={!canSave} onPress={() => void handleSave()} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 18 } });
