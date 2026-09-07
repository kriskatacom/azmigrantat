import { useAppTheme } from "@/app/_layout";
import { FontAwesome } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function NotificationsEmpty() {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <FontAwesome name="bell-o" size={48} color={theme.colors.textSecondary} />
      <Text style={[styles.title, { color: theme.colors.text }]}>Нямате известия</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Тук ще се показват пропуснати обаждания и други вътрешни известия.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingHorizontal: 30 },
  title: { fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" },
  description: { fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
});
