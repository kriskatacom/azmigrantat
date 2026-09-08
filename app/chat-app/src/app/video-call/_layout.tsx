import { useAppTheme } from "@/app/_layout";
import { useAuth } from "@/hooks/useAuth";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function VideoCallLayout() {
  const { theme } = useAppTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const returnTo = userId ? `/video-call/${userId}` : "/inbox";

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Redirect
        href={{
          pathname: "/(auth)/login",
          params: { returnTo },
        }}
      />
    );
  }

  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
