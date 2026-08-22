import { useAppTheme } from "@/app/_layout";
import AppButton from "@/components/ui/AppButton";
import OtpCodeInput from "@/components/profile/otp-code-input";
import PhoneNumberField from "@/components/profile/phone-number-field";
import { phoneDisplayParts } from "@/constants/european-dial-codes";
import {
  sendPhoneVerificationRequest,
  verifyPhoneRequest,
} from "@/services/auth";
import type { AuthUser } from "@/types/auth";
import { FontAwesome } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

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
  const [statusMessage, setStatusMessage] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const verifyingRef = useRef(false);
  const shown = phoneDisplayParts(isChanging ? phoneValue : phone || phoneValue);

  const sendCode = async (channel: "whatsapp" | "sms") => {
    if (!phoneValue.trim()) {
      Alert.alert("Липсва номер", "Изберете държава и въведете телефонния номер.");
      return;
    }

    setIsSending(true);
    setCodeError(false);
    try {
      const result = await sendPhoneVerificationRequest(
        token,
        phoneValue.trim(),
        channel,
      );
      setSentChannel(result.channel);
      setStatusMessage(result.message);
      setCode("");
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error ? error.message : "Кодът не можа да бъде изпратен.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async (rawCode: string) => {
    const normalized = rawCode.replace(/\D/g, "");
    if (normalized.length !== 6 || verifyingRef.current) {
      return;
    }

    verifyingRef.current = true;
    setIsVerifying(true);
    setCodeError(false);
    try {
      const user = await verifyPhoneRequest(token, phoneValue.trim(), normalized);
      setCode("");
      setSentChannel(null);
      setStatusMessage("");
      setIsChanging(false);
      await onVerified(user);
    } catch (error) {
      setCodeError(true);
      Alert.alert(
        "Грешка",
        error instanceof Error ? error.message : "Кодът не е валиден.",
      );
    } finally {
      verifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (next: string) => {
    setCodeError(false);
    setCode(next);
    if (next.replace(/\D/g, "").length === 6) {
      void verifyCode(next);
    }
  };

  if (isVerified && !isChanging) {
    return (
      <View
        style={[
          styles.verifiedCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.success,
          },
        ]}
      >
        <View
          style={[
            styles.verifiedIcon,
            { backgroundColor: `${theme.colors.success}22` },
          ]}
        >
          <FontAwesome name="check" size={22} color={theme.colors.success} />
        </View>
        <View style={styles.verifiedCopy}>
          <Text style={[styles.verifiedBadge, { color: theme.colors.success }]}>
            Потвърден номер
          </Text>
          <Text style={[styles.verifiedNumber, { color: theme.colors.text }]}>
            {shown.flag}  {shown.display || "Няма записан номер"}
          </Text>
          {shown.country ? (
            <Text style={[styles.verifiedMeta, { color: theme.colors.textSecondary }]}>
              {shown.country}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            setIsChanging(true);
            setPhoneValue(phone);
            setCode("");
            setSentChannel(null);
            setStatusMessage("");
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Смени телефонния номер"
        >
          <Text style={[styles.changeLink, { color: theme.colors.primary }]}>
            Смени
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {isVerified ? (
        <Pressable onPress={() => setIsChanging(false)} hitSlop={6}>
          <Text style={[styles.backLink, { color: theme.colors.primary }]}>
            ← Назад към потвърдения номер
          </Text>
        </Pressable>
      ) : (
        <View
          style={[
            styles.pendingBanner,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.warning,
            },
          ]}
        >
          <FontAwesome name="exclamation-circle" size={18} color={theme.colors.warning} />
          <Text style={[styles.pendingText, { color: theme.colors.text }]}>
            Номерът още не е потвърден. Изпрати код и го въведи по-долу.
          </Text>
        </View>
      )}

      <PhoneNumberField value={phoneValue} onChange={setPhoneValue} />

      <View style={styles.channelRow}>
        <Pressable
          onPress={() => void sendCode("whatsapp")}
          disabled={isSending || isVerifying}
          style={[
            styles.channelButton,
            {
              backgroundColor: theme.colors.card,
              borderColor:
                sentChannel === "whatsapp"
                  ? theme.colors.success
                  : theme.colors.border,
              opacity: isSending || isVerifying ? 0.55 : 1,
            },
          ]}
        >
          <FontAwesome name="whatsapp" size={22} color="#25D366" />
          <Text style={[styles.channelTitle, { color: theme.colors.text }]}>
            WhatsApp
          </Text>
          <Text style={[styles.channelHint, { color: theme.colors.textSecondary }]}>
            По-бързо
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void sendCode("sms")}
          disabled={isSending || isVerifying}
          style={[
            styles.channelButton,
            {
              backgroundColor: theme.colors.card,
              borderColor:
                sentChannel === "sms"
                  ? theme.colors.primary
                  : theme.colors.border,
              opacity: isSending || isVerifying ? 0.55 : 1,
            },
          ]}
        >
          <FontAwesome name="comment" size={20} color={theme.colors.primary} />
          <Text style={[styles.channelTitle, { color: theme.colors.text }]}>
            SMS
          </Text>
          <Text style={[styles.channelHint, { color: theme.colors.textSecondary }]}>
            Класически
          </Text>
        </Pressable>
      </View>

      {statusMessage ? (
        <Text style={[styles.statusMessage, { color: theme.colors.textSecondary }]}>
          {statusMessage}
        </Text>
      ) : null}

      <OtpCodeInput
        value={code}
        onChange={handleCodeChange}
        autoFocus={Boolean(sentChannel)}
        error={codeError}
        editable={!isVerifying}
      />

      <AppButton
        title={isVerifying ? "Проверка..." : "Потвърди номера"}
        loading={isVerifying}
        disabled={isSending || isVerifying || code.replace(/\D/g, "").length !== 6}
        onPress={() => void verifyCode(code)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  verifiedCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  verifiedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedCopy: { flex: 1, gap: 2 },
  verifiedBadge: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  verifiedNumber: { fontSize: 20, fontWeight: "800", letterSpacing: 0.3 },
  verifiedMeta: { fontSize: 13 },
  changeLink: { fontSize: 14, fontWeight: "700" },
  pendingBanner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pendingText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  backLink: { fontSize: 14, fontWeight: "700" },
  channelRow: { flexDirection: "row", gap: 10 },
  channelButton: {
    flex: 1,
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
  },
  channelTitle: { fontSize: 15, fontWeight: "800" },
  channelHint: { fontSize: 12 },
  statusMessage: { fontSize: 13, lineHeight: 18 },
});
