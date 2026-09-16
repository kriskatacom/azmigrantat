import { useAppTheme } from "@/app/_layout";
import { FontAwesome } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type ProfileCompanyCardProps = {
  companyName: string;
};

export default function ProfileCompanyCard({ companyName }: ProfileCompanyCardProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.primary }]}>
        <FontAwesome name="briefcase" size={20} color="#ffffff" />
      </View>
      <View style={styles.content}>
        <Text style={[styles.eyebrow, { color: theme.colors.textSecondary }]}>Моята компания</Text>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
          {companyName}
        </Text>
      </View>
      <FontAwesome name="check-circle" size={18} color={theme.colors.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, gap: 3 },
  eyebrow: { fontSize: 12, fontWeight: "600" },
  name: { fontSize: 17, fontWeight: "800" },
});
