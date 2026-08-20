import { useIncomingVideoCall } from "@/contexts/VideoCallContext";
import { useLocalSearchParams, useRootNavigationState, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function IncomingCallLinkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string | string[] }>();
  const navigationState = useRootNavigationState();
  const { acceptedIncomingCall } = useIncomingVideoCall();
  const action = Array.isArray(params.action) ? params.action[0] : params.action;

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    if (acceptedIncomingCall || action === "accept") {
      return;
    }

    const timeout = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
        return;
      }

      router.replace("/inbox");
    }, 1600);

    return () => clearTimeout(timeout);
  }, [acceptedIncomingCall, action, navigationState?.key, router]);

  return (
    <View style={styles.screen}>
      <ActivityIndicator color="#38bdf8" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#07111f",
  },
});
