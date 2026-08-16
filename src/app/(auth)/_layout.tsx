import { useAppTheme } from "@/app/_layout";
import { useAuth } from "@/hooks/useAuth";
import { getSafeReturnTo } from "@/utils/auth-navigation";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function AuthLayout() {
  const { theme } = useAppTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();

  if (isLoading) {
    return (
      <View
        style={[
          styles.loader,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href={getSafeReturnTo(returnTo)} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
