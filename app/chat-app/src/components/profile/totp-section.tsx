import { useAppTheme } from "@/app/_layout";
import AppButton from "@/components/ui/AppButton";
import ProfileField from "@/components/profile/profile-field";
import { useAuth } from "@/hooks/useAuth";
import {
  confirmTotpSetup,
  disableTotp,
  getTotpStatus,
  startTotpSetup,
  type TotpSetup,
} from "@/services/totp";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export default function TotpSection() {
  const { theme } = useAppTheme();
  const { token, user, updateUser } = useAuth();
  const [enabled, setEnabled] = useState(user?.totp_enabled === true);
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const status = await getTotpStatus(token);
      setEnabled(status.enabled);
    } catch {
      // Keep the last known state if the status cannot refresh.
    }
  }, [token]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleStart = async () => {
    if (!token || isWorking) {
      return;
    }

    setIsWorking(true);
    try {
      setSetup(await startTotpSetup(token));
      setCode("");
    } catch (error) {
      Alert.alert(
        "Неуспешно",
        error instanceof Error
          ? error.message
          : "Настройката не можа да започне.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleConfirm = async () => {
    if (!token || isWorking) {
      return;
    }

    const normalized = code.replace(/\D/g, "");
    if (normalized.length !== 6) {
      Alert.alert("Липсва код", "Въведете 6-цифрения код от Google Authenticator.");
      return;
    }

    setIsWorking(true);
    try {
      await confirmTotpSetup(token, normalized);
      setEnabled(true);
      setSetup(null);
      setCode("");
      if (user) {
        await updateUser({ ...user, totp_enabled: true });
      }
      Alert.alert(
        "Готово",
        "Google Authenticator е включен. При следващ вход ще искаме кода.",
      );
    } catch (error) {
      Alert.alert(
        "Неуспешно",
        error instanceof Error ? error.message : "Кодът не беше приет.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleDisable = async () => {
    if (!token || isWorking) {
      return;
    }

    const normalized = code.replace(/\D/g, "");
    if (normalized.length !== 6) {
      Alert.alert(
        "Липсва код",
        "За изключване въведете текущия код от Google Authenticator.",
      );
      return;
    }

    setIsWorking(true);
    try {
      await disableTotp(token, normalized);
      setEnabled(false);
      setSetup(null);
      setCode("");
      if (user) {
        await updateUser({ ...user, totp_enabled: false });
      }
    } catch (error) {
      Alert.alert(
        "Неуспешно",
        error instanceof Error ? error.message : "Не можа да бъде изключен.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Google Authenticator
      </Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        След парола, биометрия или Google ще искаме 6-цифрен код от приложението
        Google Authenticator.
      </Text>

      {enabled && !setup ? (
        <>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Защитата е включена
          </Text>
          <ProfileField
            label="Код за изключване"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholder="6 цифри"
          />
          <AppButton
            title="Изключи Google Authenticator"
            loading={isWorking}
            onPress={() => void handleDisable()}
          />
        </>
      ) : null}

      {!enabled && !setup ? (
        <AppButton
          title="Включи Google Authenticator"
          loading={isWorking}
          onPress={() => void handleStart()}
        />
      ) : null}

      {setup ? (
        <>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            В Google Authenticator изберете „Въведи ключ за настройка“. Акаунт:
            {` ${setup.account}`}. Ключ:
          </Text>
          <Text
            selectable
            style={[styles.secret, { color: theme.colors.text }]}
          >
            {formatSecret(setup.secret)}
          </Text>
          <AppButton
            title="Отвори Google Authenticator"
            onPress={() => {
              void Linking.openURL(setup.otpauth_url).catch(() => {
                Alert.alert(
                  "Няма приложение",
                  "Инсталирайте Google Authenticator и въведете ключа ръчно.",
                );
              });
            }}
          />
          <AppButton
            title="Сподели ключа"
            onPress={() => {
              void Share.share({ message: setup.secret });
            }}
          />
          <ProfileField
            label="Код от Google Authenticator"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholder="6 цифри"
          />
          <AppButton
            title="Потвърди и включи"
            loading={isWorking}
            onPress={() => void handleConfirm()}
          />
          <Text
            style={[styles.cancel, { color: theme.colors.textSecondary }]}
            onPress={() => {
              setSetup(null);
              setCode("");
            }}
          >
            Отказ
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 8 },
  title: { fontSize: 18, fontWeight: "800" },
  description: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 16, fontWeight: "700" },
  secret: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  cancel: {
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 4,
  },
});
