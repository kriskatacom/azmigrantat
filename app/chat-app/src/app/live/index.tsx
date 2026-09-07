import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import LiveStartBanner from "@/components/live/live-start-banner";
import LiveStreamCard from "@/components/live/live-stream-card";
import { useLiveCatalog } from "@/hooks/live/useLiveCatalog";
import { useAuth } from "@/hooks/useAuth";
import { isNetworkError } from "@/services/network-guard";
import { listActiveLives } from "@/services/live";
import type { LiveStream } from "@/types/live";
import { runAfterFocus } from "@/utils/live-navigation";
import { normalizeLiveStream } from "@/utils/normalize-live-stream";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function LiveListScreen() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const [lives, setLives] = useState<LiveStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);

  useLiveCatalog(setLives);

  const ownLive = useMemo(
    () => lives.find((item) => item.is_owner && item.status === "live") ?? null,
    [lives],
  );

  const openStream = useCallback(
    (item: LiveStream) => {
      router.push({
        pathname: item.is_owner ? "/live/[id]/stream" : "/live/[id]/watch",
        params: { id: String(item.id) },
      });
    },
    [router],
  );

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setLives([]);
        setIsLoading(false);
        return;
      }

      try {
        if (mode === "refresh" || hasLoadedRef.current) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const response = await listActiveLives(token);
        setLives(response.data.map((item) => normalizeLiveStream(item, user?.cover_image)));
        hasLoadedRef.current = true;
      } catch (error) {
        if (!isNetworkError(error)) {
          Alert.alert(
            "Грешка",
            error instanceof Error ? error.message : "Предаванията на живо не можаха да се заредят.",
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, user?.cover_image],
  );

  useFocusEffect(
    useCallback(() => runAfterFocus(() => void load("initial")), [load]),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Предавания на живо" hideSearchButton />
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
          ListHeaderComponent={
            <View style={styles.headerCard}>
              <LiveStartBanner
                isOwnLive={ownLive != null}
                onPress={() => (ownLive ? openStream(ownLive) : router.push("/live/start"))}
              />
            </View>
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
              В момента няма активни предавания на живо.
            </Text>
          }
          renderItem={({ item }) => (
            <LiveStreamCard stream={item} onPress={() => openStream(item)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: { marginBottom: 4 },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 12 },
  emptyList: { flexGrow: 1 },
  empty: { textAlign: "center", fontSize: 15, paddingTop: 24 },
});
