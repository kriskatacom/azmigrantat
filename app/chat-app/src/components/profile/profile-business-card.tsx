import { useAppTheme } from "@/app/_layout";
import RemoteImage from "@/components/ui/RemoteImage";
import { getCompanyImageUrl, getCompanyPageUrl } from "@/services/company";
import type { CompanySummary } from "@/types/company";
import { FontAwesome } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

function plainText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ProfileBusinessCard({ company }: { company: CompanySummary }) {
  const { theme, colorScheme } = useAppTheme();
  const imageUrl = getCompanyImageUrl(company);
  const pageUrl = getCompanyPageUrl(company);
  const description = plainText(company.company.excerpt || company.company.description);
  const location = [company.city?.name, company.category?.name].filter(Boolean).join(" · ");

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.heading}>
        <FontAwesome
          name="briefcase"
          size={16}
          color={colorScheme === "dark" ? "#ffffff" : "#000000"}
        />
        <Text style={[styles.headingText, { color: theme.colors.text }]}>Фирма</Text>
      </View>
      <View style={styles.body}>
        {imageUrl ? <RemoteImage uri={imageUrl} style={styles.image} /> : (
          <View style={[styles.image, styles.imageFallback, { backgroundColor: theme.colors.primary }]}>
            <FontAwesome name="building" size={24} color={theme.colors.buttonText} />
          </View>
        )}
        <View style={styles.details}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>{company.company.name}</Text>
          {location ? <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>{location}</Text> : null}
          {description ? <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2} ellipsizeMode="tail">{description}</Text> : null}
        </View>
      </View>
      {pageUrl ? (
        <Pressable
          onPress={() => void Linking.openURL(pageUrl)}
          style={[styles.link, { backgroundColor: theme.colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Отвори фирмената страница"
        >
          <Text style={[styles.linkText, { color: theme.colors.buttonText }]}>Виж фирмената страница</Text>
          <FontAwesome name="external-link" size={13} color={theme.colors.buttonText} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20, marginHorizontal: 16, borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  headingText: { fontSize: 16, fontWeight: "800" },
  body: { flexDirection: "row", gap: 12 },
  image: { width: 76, height: 76, borderRadius: 12 },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  details: { flex: 1, gap: 4 },
  name: { fontSize: 17, fontWeight: "800" },
  meta: { fontSize: 12, fontWeight: "600" },
  description: { fontSize: 13, lineHeight: 18 },
  link: { minHeight: 42, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  linkText: { fontSize: 13, fontWeight: "800" },
});
