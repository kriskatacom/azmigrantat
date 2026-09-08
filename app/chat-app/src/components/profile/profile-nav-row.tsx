import { useAppTheme } from "@/app/_layout";
import { FontAwesome } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ProfileNavRowProps = {
  href: Href;
  icon: ComponentProps<typeof FontAwesome>["name"];
  title: string;
  description: string;
};

export default function ProfileNavRow({
  href,
  icon,
  title,
  description,
}: ProfileNavRowProps) {
  const { theme } = useAppTheme();
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(href)}
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View
        style={[styles.icon, { backgroundColor: theme.colors.primary }]}
      >
        <FontAwesome name={icon} size={20} color="#ffffff" />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Text
          style={[styles.description, { color: theme.colors.textSecondary }]}
        >
          {description}
        </Text>
      </View>
      <FontAwesome
        name="chevron-right"
        size={16}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
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
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: "700" },
  description: { fontSize: 13, lineHeight: 18 },
});
