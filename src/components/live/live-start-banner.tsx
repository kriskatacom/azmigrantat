import { useAppTheme } from "@/app/_layout";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LiveStartBanner({
  isOwnLive,
  onPress,
}: {
  isOwnLive: boolean;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons name="videocam" size={26} color="#ffffff" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>{isOwnLive ? "НА ЖИВО СЕГА" : "КАМЕРА · КОМЕНТАРИ"}</Text>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
            {isOwnLive ? "Продължи предаването на живо" : "Започни предаване на живо"}
          </Text>
        </View>
      </View>

      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
        {isOwnLive
          ? "Вече имаш активно предаване. Върни се към него, вместо да пускаш второ."
          : "Включи камерата и говори с хората в реално време — с коментари, реакции и брой зрители."}
      </Text>

      {isOwnLive ? null : (
        <View style={styles.points}>
          <View style={styles.point}>
            <Ionicons name="chatbubbles-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.pointText, { color: theme.colors.text }]}>Коментари на живо</Text>
          </View>
          <View style={styles.point}>
            <Ionicons name="heart-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.pointText, { color: theme.colors.text }]}>Реакции</Text>
          </View>
          <View style={styles.point}>
            <Ionicons name="eye-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.pointText, { color: theme.colors.text }]}>Зрители</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.86}
        onPress={onPress}
        style={styles.cta}
        accessibilityRole="button"
        accessibilityLabel={isOwnLive ? "Към моето предаване на живо" : "Започни предаване на живо"}
      >
        <Ionicons name={isOwnLive ? "arrow-forward" : "radio-outline"} size={18} color="#ffffff" />
        <Text style={styles.ctaText}>
          {isOwnLive ? "Към моето предаване" : "Започни предаване на живо"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: "#dc2626",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  heroTitle: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: "800",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  points: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  point: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
  },
  pointText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cta: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
