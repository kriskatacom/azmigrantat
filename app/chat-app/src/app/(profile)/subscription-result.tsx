import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import AppButton from "@/components/ui/AppButton";
import { useAuth } from "@/hooks/useAuth";
import { getSubscription } from "@/services/payments";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function SubscriptionResultScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [checking, setChecking] = useState(status === "success");
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (status !== "success" || !token) {
      setChecking(false);
      return () => { cancelled = true; };
    }

    void getSubscription(token)
      .then((subscription) => {
        if (!cancelled) {
          setActive(subscription?.plan === "paid" && subscription.entitled === true);
        }
      })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [status, token]);

  const cancelled = status === "cancelled";
  const title = active
    ? "Платеният план е активен"
    : cancelled ? "Плащането е прекратено" : "Потвърждението се обработва";
  const message = active
    ? "Stripe потвърди тестовия абонамент и профилът ви е обновен."
    : cancelled
      ? "Не е извършено плащане и планът ви не е променен."
      : "Все още няма потвърден активен абонамент. Проверете отново след малко и не стартирайте второ плащане.";

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title="Резултат от плащането" hideSearchButton hideAuthButton />
      <View style={styles.content}>
        {checking ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : (
          <Ionicons
            name={active ? "checkmark-circle" : cancelled ? "close-circle" : "time"}
            size={70}
            color={active ? "#16A34A" : cancelled ? "#DC2626" : "#D7A400"}
          />
        )}
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
        <AppButton title="Към абонаментните планове" onPress={() => router.replace("/(profile)/subscriptions")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center", gap: 20 },
  title: { fontSize: 25, lineHeight: 32, fontWeight: "900", textAlign: "center" },
  message: { maxWidth: 420, fontSize: 16, lineHeight: 24, textAlign: "center", marginBottom: 8 },
});
