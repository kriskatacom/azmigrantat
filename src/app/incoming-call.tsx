import { useIncomingVideoCall } from "@/contexts/VideoCallContext";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function IncomingCallLinkScreen() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { acceptedIncomingCall } = useIncomingVideoCall();

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    if (acceptedIncomingCall) {
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
  }, [acceptedIncomingCall, navigationState?.key, router]);

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
