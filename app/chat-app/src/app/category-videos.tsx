import Header from "@/components/Header";
import RemoteImage from "@/components/ui/RemoteImage";
import PublicVideoPager from "@/components/video/public-video-pager";
import { useAppTheme } from "@/contexts/ThemeContext";
import { listPublicVideos } from "@/services/videos";
import { useAuth } from "@/hooks/useAuth";
import { getVideoDisplayTitle, shouldHideVideoUploader } from "@/constants/featured-video";
import type { PublicVideoItem } from "@/types/video";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function CategoryVideosScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams<{
    categoryId?: string | string[];
    categoryName?: string | string[];
    placeId?: string | string[];
    placeName?: string | string[];
  }>();
  const categoryId = Number(firstParam(params.categoryId));
  const placeId = Number(firstParam(params.placeId));
  const categoryName = firstParam(params.categoryName) || "Видеоклипове";
  const placeName = firstParam(params.placeName) || "Избрано населено място";
  const [videos, setVideos] = useState<PublicVideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);

  const loadVideos = useCallback(async (refresh = false, signal?: AbortSignal) => {
    if (!Number.isInteger(categoryId) || categoryId < 1 || !Number.isInteger(placeId) || placeId < 1) {
      setError("Категорията или населеното място е невалидно.");
      setIsLoading(false);
      return;
    }
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const response = await listPublicVideos("", signal, categoryId, placeId);
      setVideos(response.data.filter((video) => video.category_id === categoryId));
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Видеата не можаха да се заредят.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [categoryId, placeId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadVideos(false, controller.signal);
    return () => controller.abort();
  }, [loadVideos]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: categoryName, headerShown: false }} />
      <Header title={categoryName} subtitle={placeName} hideSearchButton />
      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>Зареждане на видеоклиповете...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, videos.length === 0 ? styles.emptyContent : null]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadVideos(true)} tintColor={theme.colors.primary} />}
        >
          {error ? (
            <View style={styles.centerState}>
              <Ionicons name="cloud-offline-outline" size={46} color={theme.colors.danger} />
              <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>{error}</Text>
              <Pressable style={[styles.retryButton, { backgroundColor: theme.colors.button }]} onPress={() => void loadVideos()}>
                <Text style={[styles.retryText, { color: theme.colors.buttonText }]}>Опитай отново</Text>
              </Pressable>
            </View>
          ) : videos.length === 0 ? (
            <View style={styles.centerState}>
              <Ionicons name="videocam-off-outline" size={46} color={theme.colors.icon} />
              <Text style={[styles.stateTitle, { color: theme.colors.text }]}>Няма видеоклипове</Text>
              <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>Все още няма видеоклипове за {placeName} в тази категория.</Text>
            </View>
          ) : (
            <View style={styles.videoList}>
              {videos.map((video, index) => (
                <Pressable
                  key={video.id}
                  onPress={() => setSelectedVideoIndex(index)}
                  disabled={!video.playback_url}
                  style={[styles.videoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                >
                  {video.thumbnail_url ? <RemoteImage uri={video.thumbnail_url} style={styles.thumbnail} /> : (
                    <View style={[styles.thumbnail, styles.thumbnailFallback, { backgroundColor: theme.colors.input }]}>
                      <Ionicons name="videocam-outline" size={25} color={theme.colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.videoCopy}>
                    {getVideoDisplayTitle(video) ? (
                      <Text style={[styles.videoTitle, { color: theme.colors.text }]} numberOfLines={2}>{getVideoDisplayTitle(video)}</Text>
                    ) : null}
                    {video.description ? <Text style={[styles.videoDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>{video.description}</Text> : null}
                    {video.user && !shouldHideVideoUploader(video.id) ? <Text style={[styles.videoAuthor, { color: theme.colors.primary }]} numberOfLines={1}>{video.user.name}</Text> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
      <PublicVideoPager
        visible={selectedVideoIndex !== null}
        videos={videos}
        initialIndex={selectedVideoIndex ?? 0}
        onClose={() => setSelectedVideoIndex(null)}
        colors={theme.colors}
        token={token}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  emptyContent: { flexGrow: 1 },
  videoList: { gap: 12 },
  videoCard: { minHeight: 100, borderWidth: 1, borderRadius: 16, padding: 10, flexDirection: "row", gap: 12 },
  thumbnail: { width: 128, height: 82, borderRadius: 10 },
  thumbnailFallback: { alignItems: "center", justifyContent: "center" },
  videoCopy: { flex: 1, gap: 4 },
  videoTitle: { fontSize: 16, fontWeight: "800" },
  videoDescription: { fontSize: 13, lineHeight: 18 },
  videoAuthor: { fontSize: 13, fontWeight: "700" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  stateTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  stateText: { fontSize: 15, lineHeight: 21, textAlign: "center" },
  retryButton: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  retryText: { fontSize: 15, fontWeight: "700" },
});
