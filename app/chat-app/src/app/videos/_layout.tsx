import { useAppTheme } from "@/app/_layout";
import { useAuth } from "@/hooks/useAuth";
import { Redirect, Stack, usePathname } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function VideosLayout() {
  const { theme } = useAppTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return <View style={[styles.loader, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  if (!isAuthenticated) {
    return <Redirect href={{ pathname: "/(auth)/login", params: { returnTo: pathname } }} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
});
