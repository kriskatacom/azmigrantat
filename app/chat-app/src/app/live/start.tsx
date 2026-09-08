import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import { useAuth } from "@/hooks/useAuth";
import { isNetworkError } from "@/services/network-guard";
import { createLive, listActiveLives, startLive } from "@/services/live";
import { runAfterFocus } from "@/utils/live-navigation";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

export default function StartLiveScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return;
      }

      let cancelled = false;
      const stopFocus = runAfterFocus(() => {
        void listActiveLives(token)
          .then((response) => {
            const ownLive = response.data.find((item) => item.is_owner && item.status === "live");
            if (!cancelled && ownLive) {
              queueMicrotask(() => {
                router.replace({
                  pathname: "/live/[id]/stream",
                  params: { id: String(ownLive.id) },
                });
              });
            }
          })
          .catch(() => undefined);
      });

      return () => {
        cancelled = true;
        stopFocus();
      };
    }, [token, router]),
  );

  const onStart = async () => {
    if (!token || loading) {
      return;
    }

    setLoading(true);

    try {
      const created = await createLive(token, title.trim() || undefined);

      if (created.status === "live") {
        router.replace({
          pathname: "/live/[id]/stream",
          params: { id: String(created.id) },
        });
        return;
      }

      const started = await startLive(token, created.id);
      router.replace({
        pathname: "/live/[id]/stream",
        params: { id: String(started.id) },
      });
    } catch (error) {
      if (!isNetworkError(error)) {
        Alert.alert(
          "Грешка",
          error instanceof Error ? error.message : "Предаването на живо не можа да стартира.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Започни предаване на живо" hideSearchButton />
      <View style={styles.content}>
        <AppInput
          label="Заглавие (по желание)"
          value={title}
          onChangeText={setTitle}
          placeholder="Например: Разходка из града"
          maxLength={120}
        />
        <AppButton title="Започни предаване на живо" loading={loading} onPress={() => void onStart()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
});
