import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function PaymentsScreen() {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title="Плащания" hideSearchButton hideAuthButton />
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="shield-checkmark-outline" size={42} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>Защитено плащане чрез Stripe</Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            „Ето ме“ не приема и не съхранява номера на карти или CVC кодове.
            Управлението на платения план и подновяването е в секцията „Абонаменти“.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/(profile)/subscriptions")}
          >
            <Text style={styles.buttonText}>Отвори абонаментите</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, padding: 20, justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 24, padding: 24, alignItems: "center", gap: 16 },
  title: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  description: { fontSize: 15, lineHeight: 23, textAlign: "center" },
  button: { minHeight: 52, borderRadius: 16, paddingHorizontal: 22, justifyContent: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
});
