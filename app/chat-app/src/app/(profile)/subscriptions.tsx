import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import AppButton from "@/components/ui/AppButton";
import { useAuth } from "@/hooks/useAuth";
import { getShortVideoPlans } from "@/services/payments";
import type { ShortVideoPlan } from "@/types/payments";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SHORT_VIDEO_PLAN_PRICES } from "@/constants/short-video-plans";

const planOrder = ["free", "creator", "creator_plus", "creator_pro"];
const BRAND_BLUE = "#65C9E2";
const BRAND_YELLOW = "#E8E296";
const fallbackPlanMeta: Record<string, Pick<ShortVideoPlan, "name">> = {
  free: { name: "Безплатен план" },
  creator: { name: "Creator" },
  creator_plus: { name: "Creator Plus" },
  creator_pro: { name: "Creator Pro" },
};

const planDetails: Record<string, Pick<ShortVideoPlan, "description" | "features">> = {
  free: {
    description: "Подходящ за проба и лично използване.",
    features: [
      "До 5 нови видеа месечно.",
      "Максимум 10 видеа, съхранявани едновременно.",
      "Максимум 2 GB общо място.",
      "До 3 минути на видео.",
      "Добро HD качество.",
      "Видеата могат да се гледат от други потребители.",
    ],
  },
  creator: {
    description: "Подходящ за потребители, които качват редовно.",
    features: [
      "До 20 GB общо място за видеа.",
      "До 100 GB гледания месечно.",
      "Значително повече качвания от безплатния план.",
      "Поддръжка на HD видео.",
      "Подходящ за активни създатели на съдържание.",
    ],
  },
  creator_plus: {
    description: "Подходящ за creators с повече съдържание и гледания.",
    features: [
      "До 50 GB общо място за видеа.",
      "До 250 GB гледания месечно.",
      "По-високи лимити за качване от Creator плана.",
      "Поддръжка на HD видео.",
      "Подходящ за по-активно създаване на съдържание.",
    ],
  },
  creator_pro: {
    description: "Подходящ за по-активни създатели с повече видеа и гледания.",
    features: [
      "До 100 GB общо място за видеа.",
      "До 500 GB гледания месечно.",
      "По-високи лимити за качване.",
      "Поддръжка на по-високо качество.",
      "Разширена статистика за видеата.",
    ],
  },
};

export default function SubscriptionsScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Record<string, ShortVideoPlan>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      setPlans(await getShortVideoPlans(token));
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Плановете не можаха да бъдат заредени.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void loadPlans(); }, [loadPlans]));

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View pointerEvents="none" style={styles.gradientBackground}>
        <View style={[styles.gradientBlob, styles.blueBlob]} />
        <View style={[styles.gradientBlob, styles.yellowBlob]} />
        <View style={[styles.gradientBlob, styles.purpleBlob]} />
        <View style={[styles.gradientFade, { backgroundColor: theme.colors.background }]} />
      </View>
      <Header title="Абонаменти" hideSearchButton hideAuthButton />
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="sparkles" size={28} color="#101827" /></View>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Създавай повече. Достигай повече.</Text>
          <Text style={[styles.heroText, { color: theme.colors.textSecondary }]}>Избери план за твоите short-video видеа и получи повече място, качвания и гледания.</Text>
        </View>

        {isLoading ? <ActivityIndicator size="large" color={theme.colors.primary} /> : planOrder.map((key) => {
          const plan = plans[key] ?? { ...fallbackPlanMeta[key], currency: "eur", price_cents: SHORT_VIDEO_PLAN_PRICES[key] };
          const details = planDetails[key];
          const features = plan.features?.length ? plan.features : details?.features ?? [];
          const description = plan.description ?? details?.description;
          const isPopular = key === "creator_plus";
          const isFree = key === "free";
          return (
            <View key={key} style={[styles.planCard, isPopular && styles.popularCard, { backgroundColor: theme.colors.card, borderColor: isPopular ? BRAND_BLUE : theme.colors.border }]}>
              {isPopular ? <View style={[styles.popularBadge, { backgroundColor: BRAND_YELLOW }]}><Text style={styles.popularBadgeText}>НАЙ-ПОПУЛЯРЕН</Text></View> : null}
              <View style={styles.planHeader}>
                <View style={[styles.planIcon, { backgroundColor: isPopular ? BRAND_YELLOW : `${BRAND_BLUE}22` }]}>
                  <Ionicons name={isFree ? "leaf-outline" : key === "creator_pro" ? "rocket-outline" : "sparkles-outline"} size={24} color={BRAND_BLUE} />
                </View>
                <View style={styles.planHeading}>
                  <Text style={[styles.planName, { color: theme.colors.text }]}>{plan.name}</Text>
                  <Text style={[styles.price, { color: theme.colors.text }]}>{isFree ? "Безплатен" : `${(SHORT_VIDEO_PLAN_PRICES[key] / 100).toFixed(2)} €`}<Text style={[styles.period, { color: theme.colors.textSecondary }]}>{isFree ? "" : " / месец"}</Text></Text>
                </View>
              </View>
              {description ? <Text style={[styles.planDescription, { color: theme.colors.textSecondary }]}>{description}</Text> : null}
              <View style={styles.features}>
                {features.map((feature) => <View key={feature} style={styles.featureRow}><Ionicons name="checkmark-circle" size={19} color={BRAND_BLUE} /><Text style={[styles.featureText, { color: theme.colors.text }]}>{feature}</Text></View>)}
              </View>
              {!isFree ? <AppButton title="Избери план" onPress={() => router.push("/(profile)/payments")} /> : <Text style={[styles.freeNote, { color: theme.colors.textSecondary }]}>Подходящ за проба и лично използване.</Text>}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  gradientBackground: { ...StyleSheet.absoluteFill, overflow: "hidden", backgroundColor: "#101A3A" },
  gradientBlob: { position: "absolute", width: 300, height: 300, borderRadius: 150, opacity: 0.55 },
  blueBlob: { top: -90, left: -80, backgroundColor: "#2D8CFF" },
  yellowBlob: { top: 180, right: -120, backgroundColor: "#E8E296" },
  purpleBlob: { bottom: 30, left: -110, backgroundColor: "#7C5CFF" },
  gradientFade: { ...StyleSheet.absoluteFill, opacity: 0.72 },
  content: { padding: 20, paddingBottom: 44, gap: 16 },
  hero: { alignItems: "center", paddingVertical: 10, gap: 10 },
  heroIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: BRAND_YELLOW, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 25, fontWeight: "900", textAlign: "center" },
  heroText: { fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 360 },
  planCard: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 18 },
  popularCard: { borderWidth: 2 },
  popularBadge: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  popularBadgeText: { color: "#101827", fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 13 },
  planIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  planHeading: { flex: 1, gap: 3 },
  planName: { fontSize: 20, fontWeight: "900" },
  price: { fontSize: 22, fontWeight: "900" },
  period: { fontSize: 13, fontWeight: "600" },
  planDescription: { fontSize: 14, lineHeight: 20 },
  features: { gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  featureText: { flex: 1, fontSize: 14, lineHeight: 20 },
  freeNote: { fontSize: 13, textAlign: "center" },
});
