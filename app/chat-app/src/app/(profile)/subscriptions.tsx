import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import { STRIPE_SANDBOX_ENABLED } from "@/config/environment";
import { useAuth } from "@/hooks/useAuth";
import {
  createSubscriptionCheckout,
  deactivatePaidSubscription,
  getShortVideoPlans,
  getSubscription,
  setAutoRenewal,
} from "@/services/payments";
import type { ShortVideoPlan, SubscriptionStatus } from "@/types/payments";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

const FREE_FEATURES = [
  "Профилна снимка, име и кратко описание",
  "Снимки, видеа и публикации",
  "Чат, аудио и видеоразговори",
] as const;

export default function SubscriptionsScreen() {
  const { theme, colorScheme } = useAppTheme();
  const { token } = useAuth();
  const isDark = colorScheme === "dark";
  const [plans, setPlans] = useState<Record<string, ShortVideoPlan>>({});
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [updatingRenewal, setUpdatingRenewal] = useState(false);
  const [deactivatingPlan, setDeactivatingPlan] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [availablePlans, current] = await Promise.all([
        getShortVideoPlans(token),
        getSubscription(token),
      ]);
      setPlans(availablePlans);
      setSubscription(current);
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Плановете не можаха да бъдат заредени.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const paidPlan = plans.paid;
  const paidIsActive = subscription?.plan === "paid" && subscription.entitled === true;
  const checkoutAvailable = STRIPE_SANDBOX_ENABLED
    && paidPlan?.configured === true
    && paidPlan.active === true
    && !paidIsActive;
  const paidButtonHighlighted = checkoutAvailable || paidIsActive;
  const paidButtonForeground = paidButtonHighlighted ? "#FFF8D9" : "#6F6244";
  const price = paidPlan?.active === false
    ? "Безплатно"
    : paidPlan?.price_cents == null
    ? "Цена предстои"
    : `${(paidPlan.price_cents / 100).toFixed(2).replace(".", ",")} € / 30 дни`;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleString("bg-BG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const startCheckout = async () => {
    if (!token || !checkoutAvailable || openingCheckout) return;
    setOpeningCheckout(true);
    try {
      const url = await createSubscriptionCheckout(token, "paid");
      if (!url.startsWith("https://business.azmigrantat.com/subscriptions/start?token=")) {
        throw new Error("Получен е невалиден адрес за плащане.");
      }
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Плащането не стартира", error instanceof Error ? error.message : "Опитайте отново.");
    } finally {
      setOpeningCheckout(false);
    }
  };

  const updateRenewal = async (enabled: boolean) => {
    if (!token || !subscription || !paidIsActive || updatingRenewal) return;
    setUpdatingRenewal(true);
    try {
      const confirmed = await setAutoRenewal(token, enabled);
      setSubscription((current) => current ? {
        ...current,
        auto_renewal: confirmed,
        cancel_at_period_end: !confirmed,
      } : current);
    } catch (error) {
      try {
        setSubscription(await getSubscription(token));
      } catch {
        // Keep the last provider-confirmed state already shown in the UI.
      }
      Alert.alert("Настройката не е променена", error instanceof Error ? error.message : "Опитайте отново.");
    } finally {
      setUpdatingRenewal(false);
    }
  };

  const confirmDeactivation = () => {
    if (!token || !paidIsActive || deactivatingPlan) return;
    Alert.alert(
      "Преминаване към безплатен план",
      "Платеният достъп ще бъде прекратен веднага. Автоматичното подновяване ще бъде спряно и платените функции повече няма да са достъпни.",
      [
        { text: "Отказ", style: "cancel" },
        {
          text: "Премини към безплатен",
          style: "destructive",
          onPress: () => void deactivatePlan(),
        },
      ],
    );
  };

  const deactivatePlan = async () => {
    if (!token || !paidIsActive || deactivatingPlan) return;
    setDeactivatingPlan(true);
    try {
      setSubscription(await deactivatePaidSubscription(token));
      Alert.alert("Планът е променен", "Вече използвате безплатния план.");
    } catch (error) {
      try {
        setSubscription(await getSubscription(token));
      } catch {
        // Keep the last provider-confirmed state already shown in the UI.
      }
      Alert.alert(
        "Планът не е променен",
        error instanceof Error ? error.message : "Опитайте отново.",
      );
    } finally {
      setDeactivatingPlan(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title="Абонаментни планове" hideSearchButton hideAuthButton />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      >
        <View style={styles.brandPanel}>
          <Image
            source={require("../../../assets/images/logo-transparent.png")}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityLabel="Ето ме"
          />
        </View>

        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Избери своя план</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>
            Започни безплатно или активирай платения тестов план чрез защитена
            Stripe Sandbox страница.
          </Text>
        </View>

        <View
          style={[
            styles.planCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.primary,
            },
          ]}
        >
          <View style={styles.planTopRow}>
            <View style={styles.planHeading}>
              <Text style={[styles.freePlanName, { color: theme.colors.text }]}>БЕЗПЛАТЕН</Text>
              <Text style={[styles.freePrice, { color: theme.colors.text }]}>0 €</Text>
            </View>
            <View style={[styles.currentBadge, { backgroundColor: `${theme.colors.primary}18` }]}>
              <Ionicons name="checkmark-circle" size={17} color={theme.colors.primary} />
              <Text style={[styles.currentBadgeText, { color: theme.colors.primary }]}>
                {paidIsActive ? "БАЗОВ ПЛАН" : "ТЕКУЩ ПЛАН"}
              </Text>
            </View>
          </View>

          <View style={styles.features}>
            {FREE_FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <View style={[styles.checkIcon, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.featureText, { color: theme.colors.text }]}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.planButton, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.planButtonText}>
              {paidIsActive ? "Включен в платения план" : "Активен безплатен план"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.planCard,
            styles.paidCard,
            {
              backgroundColor: isDark ? "#241F12" : "#FFFCF2",
              borderColor: "#E7B51B",
            },
          ]}
        >
          <View style={styles.paidHeadingRow}>
            <View style={styles.crownIcon}>
              <Ionicons name="diamond" size={27} color="#8A6200" />
            </View>
            <View style={styles.planHeading}>
              <Text style={[styles.paidPlanName, { color: theme.colors.text }]}>ПЛАТЕН</Text>
              <Text style={[styles.pricePending, { color: theme.colors.text }]}>{price}</Text>
            </View>
          </View>

          <Text style={[styles.paidDescription, { color: theme.colors.textSecondary }]}>
            Всичко от безплатния план, плюс допълнителни възможности, които ще
            бъдат добавени след уточняването им.
          </Text>

          <View style={[styles.pendingFeature, { borderColor: isDark ? "#6F5B20" : "#E9D99A" }]}>
            <Ionicons name="sparkles-outline" size={21} color="#D7A400" />
            <Text style={[styles.pendingFeatureText, { color: theme.colors.textSecondary }]}>
              Функциите на платения план ще бъдат обявени допълнително.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.planButton,
              styles.paidButton,
              paidButtonHighlighted && styles.paidButtonEnabled,
              pressed && checkoutAvailable && styles.paidButtonPressed,
              !paidButtonHighlighted && styles.disabledButton,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !checkoutAvailable }}
            disabled={!checkoutAvailable || openingCheckout}
            onPress={() => void startCheckout()}
          >
            {openingCheckout || loading ? (
              <ActivityIndicator color={paidButtonForeground} />
            ) : paidIsActive ? null : (
              <Ionicons
                name="card-outline"
                size={21}
                color={paidButtonForeground}
              />
            )}
            <Text
              style={[styles.paidButtonText, { color: paidButtonForeground }]}
              numberOfLines={1}
            >
              {paidIsActive
                ? "Активен платен план"
                : checkoutAvailable
                  ? "Активирай платения план"
                  : paidPlan?.active === false
                    ? "Платеният план не е активен"
                    : "Недостъпно в тази версия"}
            </Text>
          </Pressable>

          {paidIsActive && (
            <>
              <View style={[styles.renewalPanel, { borderColor: isDark ? "#6F5B20" : "#E9D99A" }]}>
                <View style={styles.renewalText}>
                  <Text style={[styles.renewalTitle, { color: theme.colors.text }]}>Автоматично подновяване</Text>
                  <Text style={[styles.renewalDescription, { color: theme.colors.textSecondary }]}>
                    {subscription?.auto_renewal
                      ? `Следващото плащане е на ${periodEnd ?? "края на периода"}.`
                      : `Достъпът остава активен до ${periodEnd ?? "края на платения период"}, след което приключва.`}
                  </Text>
                </View>
                <Switch
                  value={subscription?.auto_renewal === true}
                  onValueChange={(enabled) => void updateRenewal(enabled)}
                  disabled={updatingRenewal || deactivatingPlan}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Автоматично подновяване на всеки 30 дни"
                />
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.deactivateButton,
                  pressed && !deactivatingPlan && styles.deactivateButtonPressed,
                  deactivatingPlan && styles.deactivateButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Премини към безплатен план"
                disabled={deactivatingPlan}
                onPress={confirmDeactivation}
              >
                {deactivatingPlan ? <ActivityIndicator color="#FFB4AB" /> : null}
                <Text style={styles.deactivateButtonText} numberOfLines={1}>
                  {deactivatingPlan ? "Промяна на плана…" : "Премини към безплатен план"}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={[styles.safetyNote, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="shield-checkmark-outline" size={21} color={theme.colors.primary} />
          <Text style={[styles.safetyNoteText, { color: theme.colors.textSecondary }]}>
            {STRIPE_SANDBOX_ENABLED
              ? "Това е тестов Stripe режим. Не използвайте реална карта; планът се активира само след подписано webhook потвърждение."
              : "В тази версия не се извършват плащания и не се изискват данни за карта."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 48 },
  brandPanel: {
    minHeight: 92,
    paddingHorizontal: 22,
    borderBottomWidth: 4,
    borderBottomColor: "#258AF2",
    backgroundColor: "#071B3B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogo: { width: 190, height: 70 },
  hero: { alignItems: "center", paddingHorizontal: 24, paddingTop: 28, paddingBottom: 22 },
  heroTitle: { fontSize: 29, lineHeight: 36, fontWeight: "900", textAlign: "center" },
  heroSubtitle: { maxWidth: 390, marginTop: 8, fontSize: 15, lineHeight: 22, textAlign: "center" },
  planCard: {
    marginHorizontal: 18,
    marginBottom: 18,
    borderWidth: 2,
    borderRadius: 24,
    padding: 20,
    gap: 20,
  },
  paidCard: { borderWidth: 2 },
  planTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  planHeading: { flex: 1, gap: 3 },
  freePlanName: { fontSize: 23, fontWeight: "900", letterSpacing: 0.3 },
  freePrice: { fontSize: 43, lineHeight: 49, fontWeight: "900" },
  currentBadge: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  currentBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  features: { gap: 13 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  checkIcon: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: "600" },
  planButton: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  planButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  paidHeadingRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  crownIcon: {
    width: 51,
    height: 51,
    borderRadius: 17,
    backgroundColor: "#F7D563",
    alignItems: "center",
    justifyContent: "center",
  },
  paidPlanName: { fontSize: 23, fontWeight: "900", letterSpacing: 0.3 },
  pricePending: { fontSize: 24, lineHeight: 30, fontWeight: "900" },
  paidDescription: { fontSize: 15, lineHeight: 22 },
  renewalPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  renewalText: { flex: 1, gap: 4 },
  renewalTitle: { fontSize: 15, fontWeight: "900" },
  renewalDescription: { fontSize: 13, lineHeight: 19 },
  pendingFeature: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pendingFeatureText: { flex: 1, fontSize: 14, lineHeight: 20 },
  paidButton: {
    width: "100%",
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    gap: 9,
    borderWidth: 2,
    borderColor: "#FFE680",
    backgroundColor: "#A86F00",
  },
  paidButtonEnabled: {
    shadowColor: "#FFD21F",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.78,
    shadowRadius: 12,
    elevation: 10,
  },
  paidButtonPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  paidButtonText: { flexShrink: 1, fontSize: 16, fontWeight: "900", textAlign: "center" },
  disabledButton: {
    borderColor: "#D4C9A4",
    backgroundColor: "#E8E0C7",
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  deactivateButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D95D52",
    borderRadius: 16,
    backgroundColor: "#3A1715",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deactivateButtonPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  deactivateButtonDisabled: { opacity: 0.58 },
  deactivateButtonText: { color: "#FFDAD6", fontSize: 15, fontWeight: "900", textAlign: "center" },
  safetyNote: {
    marginHorizontal: 18,
    borderRadius: 17,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  safetyNoteText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
