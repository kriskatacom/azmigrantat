import { useAppTheme } from "@/app/_layout";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function InboxLoading() {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>Зареждане на разговорите...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { marginTop: 12 },
});
