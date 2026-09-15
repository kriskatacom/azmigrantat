import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import RemoteImage from "@/components/ui/RemoteImage";
import ProfileVideoPager from "@/components/video/profile-video-pager";
import { useAuth } from "@/hooks/useAuth";
import { getPublicProfile, type PublicUserProfile } from "@/services/profile";
import { getVideoPlayback } from "@/services/videos";
import type { VideoItem } from "@/types/video";
import { FontAwesome } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

const VIDEO_PAGE_SIZE = 10;

export default function UserVideosScreen() {
  const { theme } = useAppTheme();
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const userId = useMemo(() => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const parsed = rawId ? Number(rawId) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
  }, [params.id]);
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(-1);
  const [playbackUrls, setPlaybackUrls] = useState<Record<number, string>>({});
  const [playbackExpiresAt, setPlaybackExpiresAt] = useState<Record<number, number>>({});
  const [isPagerVisible, setIsPagerVisible] = useState(false);
  const [isOpeningVideo, setIsOpeningVideo] = useState(false);

  const loadVideos = useCallback(async (nextPage: number) => {
    if (!token || !Number.isInteger(userId)) return;
    const firstPage = nextPage === 1;
    if (firstPage) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const response = await getPublicProfile(token, userId, {
        videosPage: nextPage,
        videosLimit: VIDEO_PAGE_SIZE,
      });
      setProfile((current) => current ?? response);
      setVideos((current) => {
        if (firstPage) return response.videos ?? [];
        const existingIds = new Set(current.map((video) => video.id));
        return [...current, ...(response.videos ?? []).filter((video) => !existingIds.has(video.id))];
      });
      setPage(response.videos_pagination?.page ?? nextPage);
      setHasMore(response.videos_pagination?.has_more ?? false);
    } catch (error) {
      console.error("[ProfileVideos] Видеоклиповете не можаха да бъдат заредени.", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [token, userId]);

  useEffect(() => {
    void loadVideos(1);
  }, [loadVideos]);

  const loadPlaybackAtIndex = useCallback(async (index: number) => {
    const video = videos[index];
    if (!video || !token || isOpeningVideo || video.status !== "ready") return;
    const cachedUrl = playbackUrls[video.id];
    const expiresAt = playbackExpiresAt[video.id] ?? 0;
    if (cachedUrl && (!expiresAt || expiresAt > Math.floor(Date.now() / 1000) + 30)) return;
    setIsOpeningVideo(true);
    try {
      const response = await getVideoPlayback(token, video.id);
      setPlaybackUrls((current) => ({ ...current, [video.id]: response.data.url }));
      setPlaybackExpiresAt((current) => ({ ...current, [video.id]: response.data.expires_at }));
    } catch (error) {
      console.error("[VideoPlayback] Видеото не можа да бъде отворено.", error);
    } finally {
      setIsOpeningVideo(false);
    }
  }, [isOpeningVideo, playbackExpiresAt, playbackUrls, token, videos]);

  const openVideo = useCallback(async (video: VideoItem) => {
    const index = videos.findIndex((item) => item.id === video.id);
    if (index < 0) return;
    setSelectedVideoIndex(index);
    setIsPagerVisible(true);
    await loadPlaybackAtIndex(index);
  }, [loadPlaybackAtIndex, videos]);

  const closeVideo = useCallback(() => {
    setSelectedVideoIndex(-1);
    setIsPagerVisible(false);
  }, []);

  if (isAuthLoading) {
    return <View style={[styles.centered, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  const displayName =
    profile?.name?.trim() ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
    "Потребител";

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title="Видеоклипове" brandTitle={displayName} hideSearchButton hideAuthButton />
      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(video) => String(video.id)}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          onEndReached={() => {
            if (hasMore && !isLoadingMore) void loadVideos(page + 1);
          }}
          onEndReachedThreshold={0.6}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.textSecondary }]}>Този потребител все още няма видеоклипове.</Text>}
          ListFooterComponent={hasMore ? <ActivityIndicator style={styles.footer} size="small" color={theme.colors.primary} /> : null}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => void openVideo(item)}
              disabled={isOpeningVideo || item.status !== "ready"}
              style={[styles.videoItem, { borderColor: theme.colors.border }, item.status !== "ready" && styles.processing]}
              accessibilityRole="button"
              accessibilityLabel={item.status !== "ready" ? `${item.title} — обработва се` : `Пусни ${item.title}`}
            >
              {item.thumbnail_url ? <RemoteImage uri={item.thumbnail_url} style={styles.thumbnail} /> : <View style={[styles.thumbnail, styles.placeholder, { backgroundColor: theme.colors.surface }]}><FontAwesome name="video-camera" size={26} color={theme.colors.textSecondary} /></View>}
              <View style={styles.details}>
                <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
                {item.description ? <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>{item.description}</Text> : null}
                {item.status !== "ready" ? <Text style={[styles.status, { color: theme.colors.textSecondary }]}>Видеото се обработва — ще бъде достъпно за гледане скоро.</Text> : null}
              </View>
            </Pressable>
          )}
        />
      )}
      <ProfileVideoPager
        visible={isPagerVisible}
        videos={videos}
        initialIndex={selectedVideoIndex}
        playbackUrls={playbackUrls}
        onRequestPlayback={(index) => {
          setSelectedVideoIndex(index);
          void loadPlaybackAtIndex(index);
        }}
        onClose={closeVideo}
        colors={theme.colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { paddingTop: 24, textAlign: "center", fontSize: 15 },
  footer: { paddingVertical: 12 },
  videoItem: { flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  processing: { opacity: 0.72 },
  thumbnail: { width: 120, height: 78, borderRadius: 10 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  details: { flex: 1, justifyContent: "center", gap: 5 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: "800" },
  description: { fontSize: 13, lineHeight: 18 },
  status: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
});
