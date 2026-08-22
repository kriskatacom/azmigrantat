import { useAppTheme } from "@/app/_layout";
import AppButton from "@/components/ui/AppButton";
import PhoneNumberField from "@/components/profile/phone-number-field";
import ProfileField from "@/components/profile/profile-field";
import {
  sendPhoneVerificationRequest,
  verifyPhoneRequest,
} from "@/services/auth";
import type { AuthUser } from "@/types/auth";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

interface PhoneVerificationFormProps {
  token: string;
  phone: string;
  isVerified: boolean;
  onVerified: (user: AuthUser) => Promise<void>;
}

export default function PhoneVerificationForm({
  token,
  phone,
  isVerified,
  onVerified,
}: PhoneVerificationFormProps) {
  const { theme } = useAppTheme();
  const [phoneValue, setPhoneValue] = useState(phone);
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sentChannel, setSentChannel] = useState<string | null>(null);

  const sendCode = async (channel: "whatsapp" | "sms") => {
    if (!phoneValue.trim()) {
      Alert.alert("Липсва номер", "Изберете държава и въведете телефонния номер.");
      return;
    }

    setIsSending(true);
    try {
      const result = await sendPhoneVerificationRequest(
        token,
        phoneValue.trim(),
        channel,
      );
      setSentChannel(result.channel);
      Alert.alert("Кодът е изпратен", result.message);
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error ? error.message : "Кодът не можа да бъде изпратен.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    if (code.trim().length !== 6) {
      Alert.alert("Невалиден код", "Въведете 6-цифрения код.");
      return;
    }

    setIsVerifying(true);
    try {
      const user = await verifyPhoneRequest(token, phoneValue.trim(), code.trim());
      setCode("");
      await onVerified(user);
      Alert.alert("Готово", "Телефонният номер е потвърден.");
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error ? error.message : "Кодът не е валиден.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.status, { color: isVerified ? theme.colors.success : theme.colors.warning }]}>
        {isVerified ? "Номерът е потвърден." : "Номерът не е потвърден."}
      </Text>
      {!isVerified ? (
        <>
          <PhoneNumberField value={phoneValue} onChange={setPhoneValue} />
          <AppButton
            title="Изпрати код по WhatsApp"
            loading={isSending}
            disabled={isSending || isVerifying}
            onPress={() => void sendCode("whatsapp")}
          />
          <AppButton
            title="Изпрати код по SMS"
            loading={isSending}
            disabled={isSending || isVerifying}
            onPress={() => void sendCode("sms")}
          />
          {sentChannel ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              Последно изпращане: {sentChannel === "whatsapp" ? "WhatsApp" : "SMS"}
            </Text>
          ) : null}
          <ProfileField
            label="Код за потвърждение"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
          <AppButton
            title="Потвърди номера"
            loading={isVerifying}
            disabled={isSending || isVerifying}
            onPress={() => void verifyCode()}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  status: { fontSize: 14, fontWeight: "700" },
});
