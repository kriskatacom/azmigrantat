import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import { useAuth } from "@/hooks/useAuth";
import { isNetworkError } from "@/services/network-guard";
import { createLive, startLive } from "@/services/live";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

export default function StartLiveScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const onStart = async () => {
    if (!token || loading) {
      return;
    }

    setLoading(true);

    try {
      const created = await createLive(token, title.trim() || undefined);
      const started = await startLive(token, created.id);
      router.replace({
        pathname: "/live/[id]/stream",
        params: { id: String(started.id) },
      });
    } catch (error) {
      if (!isNetworkError(error)) {
        Alert.alert(
          "Грешка",
          error instanceof Error ? error.message : "Live предаването не можа да стартира.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Start Live" hideSearchButton />
      <View style={styles.content}>
        <AppInput
          label="Заглавие (по желание)"
          value={title}
          onChangeText={setTitle}
          placeholder="Например: Разходка из града"
          maxLength={120}
        />
        <AppButton title="Започни Live" loading={loading} onPress={() => void onStart()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
});
