import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import AppButton from "@/components/ui/AppButton";
import { useLiveCatalog } from "@/hooks/live/useLiveCatalog";
import { useAuth } from "@/hooks/useAuth";
import { isNetworkError } from "@/services/network-guard";
import { listActiveLives } from "@/services/live";
import type { LiveStream } from "@/types/live";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LiveListScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();
  const [lives, setLives] = useState<LiveStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useLiveCatalog(setLives);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setLives([]);
        setIsLoading(false);
        return;
      }

      try {
        if (mode === "refresh") {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const response = await listActiveLives(token);
        setLives(response.data);
      } catch (error) {
        if (!isNetworkError(error)) {
          Alert.alert(
            "Грешка",
            error instanceof Error ? error.message : "Live предаванията не можаха да се заредят.",
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void load("initial");
    }, [load]),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Live" hideSearchButton />
      <View style={styles.actions}>
        <AppButton title="Start Live" onPress={() => router.push("/live/start")} />
      </View>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={lives}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, lives.length === 0 && styles.emptyList]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void load("refresh")}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
              В момента няма активни live предавания.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.colors.card }]}
              onPress={() =>
                router.push({
                  pathname: item.is_owner ? "/live/[id]/stream" : "/live/[id]/watch",
                  params: { id: String(item.id) },
                })
              }
            >
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>LIVE</Text>
              </View>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {item.title || item.owner?.name || "Live предаване"}
              </Text>
              <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                {item.owner?.name ?? "Стриймър"} · {item.viewer_count} зрители
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actions: { paddingHorizontal: 16, paddingTop: 12 },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 12 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  empty: { textAlign: "center", fontSize: 15 },
  card: { borderRadius: 16, padding: 16 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#dc2626" },
  liveLabel: { color: "#dc2626", fontWeight: "800", fontSize: 12 },
  title: { fontSize: 17, fontWeight: "700" },
  meta: { marginTop: 6, fontSize: 13 },
});
