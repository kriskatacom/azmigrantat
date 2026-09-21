import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import ChatMoreOptionsModal from "@/components/chat/chat-more-options-modal";
import RemoteImage from "@/components/ui/RemoteImage";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ProfileVideoPager from "@/components/video/profile-video-pager";
import VideoEditModal from "@/components/video/video-edit-modal";
import VideoViewsBadge from "@/components/video/video-views-badge";
import { useAuth } from "@/hooks/useAuth";
import { getPublicProfile, type PublicUserProfile } from "@/services/profile";
import {
  deleteVideo,
  getVideoPlayback,
  recordVideoView,
  updateVideo,
  uploadVideoThumbnail,
} from "@/services/videos";
import type { VideoItem } from "@/types/video";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  const [videoMenuTarget, setVideoMenuTarget] = useState<VideoItem | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<VideoItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnail, setEditThumbnail] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isManagingVideo, setIsManagingVideo] = useState(false);

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

  const startEditingVideo = useCallback((video: VideoItem) => {
    if (!profile?.is_self || isManagingVideo) return;
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description ?? "");
    setEditThumbnail(null);
  }, [isManagingVideo, profile?.is_self]);

  const chooseEditThumbnail = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Нужен е достъп до снимките",
        "Разрешете достъп до снимките от настройките на телефона.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });
    if (!result.canceled) setEditThumbnail(result.assets[0]);
  }, []);

  const saveVideo = useCallback(async () => {
    if (!token || !editingVideo || !editTitle.trim() || isManagingVideo) return;
    setIsManagingVideo(true);
    try {
      let updated = (await updateVideo(token, editingVideo.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      })).data;

      if (editThumbnail) {
        updated = (await uploadVideoThumbnail(token, editingVideo.id, {
          uri: editThumbnail.uri,
          name: editThumbnail.fileName ?? "thumbnail.jpg",
          mimeType: editThumbnail.mimeType ?? "image/jpeg",
        })).data;
      }

      setVideos((current) => current.map((video) => (
        video.id === updated.id ? updated : video
      )));
      setEditingVideo(null);
      setEditThumbnail(null);
      Alert.alert("Готово", "Видеото беше редактирано.");
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error ? error.message : "Видеото не можа да бъде редактирано.",
      );
    } finally {
      setIsManagingVideo(false);
    }
  }, [editDescription, editThumbnail, editTitle, editingVideo, isManagingVideo, token]);

  const confirmDeleteVideo = useCallback(async () => {
    if (!token || !deletingVideo || isManagingVideo) return;
    setIsManagingVideo(true);
    try {
      await deleteVideo(token, deletingVideo.id);
      setVideos((current) => current.filter((video) => video.id !== deletingVideo.id));
      setPlaybackUrls((current) => {
        const next = { ...current };
        delete next[deletingVideo.id];
        return next;
      });
      setPlaybackExpiresAt((current) => {
        const next = { ...current };
        delete next[deletingVideo.id];
        return next;
      });
      setDeletingVideo(null);
      Alert.alert("Готово", "Видеото беше изтрито.");
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error ? error.message : "Видеото не можа да бъде изтрито.",
      );
    } finally {
      setIsManagingVideo(false);
    }
  }, [deletingVideo, isManagingVideo, token]);

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
              <View style={styles.thumbnailWrap}>
                {item.thumbnail_url ? <RemoteImage uri={item.thumbnail_url} style={styles.thumbnail} /> : <View style={[styles.thumbnail, styles.placeholder, { backgroundColor: theme.colors.surface }]}><FontAwesome name="video-camera" size={26} color={theme.colors.textSecondary} /></View>}
                <VideoViewsBadge count={item.total_views} />
              </View>
              <View style={styles.details}>
                <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
                {item.description ? <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>{item.description}</Text> : null}
                {item.status !== "ready" ? <Text style={[styles.status, { color: theme.colors.textSecondary }]}>Видеото се обработва — ще бъде достъпно за гледане скоро.</Text> : null}
              </View>
              {profile?.is_self ? (
                <TouchableOpacity
                  onPress={() => setVideoMenuTarget(item)}
                  disabled={isManagingVideo}
                  style={styles.videoMoreButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Още действия за ${item.title}`}
                >
                  <FontAwesome name="ellipsis-h" size={15} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </Pressable>
          )}
        />
      )}

      <ChatMoreOptionsModal
        visible={Boolean(videoMenuTarget)}
        onClose={() => setVideoMenuTarget(null)}
        title="Опции за видеото"
        subtitle={videoMenuTarget?.title ?? "Изберете действие."}
        options={videoMenuTarget ? [
          {
            icon: "pencil",
            label: "Редактирай",
            onPress: () => startEditingVideo(videoMenuTarget),
          },
          {
            icon: "trash",
            label: "Изтрий",
            destructive: true,
            onPress: () => setDeletingVideo(videoMenuTarget),
          },
        ] : []}
        colors={theme.colors}
      />
      <ConfirmModal
        visible={Boolean(deletingVideo)}
        title="Изтриване на видео"
        message={`Видеото „${deletingVideo?.title ?? ""}“ ще бъде изтрито от профила. Това действие не може да бъде отменено.`}
        confirmText="Изтрий видеото"
        destructive
        onConfirm={() => void confirmDeleteVideo()}
        onCancel={() => setDeletingVideo(null)}
      />
      <VideoEditModal
        visible={Boolean(editingVideo)}
        title={editTitle}
        description={editDescription}
        thumbnailUri={editThumbnail?.uri ?? editingVideo?.thumbnail_url ?? null}
        busy={isManagingVideo}
        onChangeTitle={setEditTitle}
        onChangeDescription={setEditDescription}
        onChooseThumbnail={() => void chooseEditThumbnail()}
        onSave={() => void saveVideo()}
        onCancel={() => {
          if (isManagingVideo) return;
          setEditingVideo(null);
          setEditThumbnail(null);
        }}
      />
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
        onViewVideo={(videoId) => {
          if (!token) return;
          void recordVideoView(token, videoId)
            .then(({ data }) => {
              setVideos((current) => current.map((video) => (
                video.id === videoId
                  ? { ...video, total_views: data.total_views, unique_viewers: data.unique_viewers }
                  : video
              )));
            })
            .catch((error) => {
              console.warn("[ProfileVideos] Гледането не можа да бъде отчетено.", { videoId, error });
            });
        }}
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
  videoItem: { position: "relative", flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  processing: { opacity: 0.72 },
  thumbnail: { width: 120, height: 78, borderRadius: 10 },
  thumbnailWrap: { position: "relative", width: 120, height: 78 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  details: { flex: 1, justifyContent: "center", gap: 5, paddingRight: 28 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: "800" },
  description: { fontSize: 13, lineHeight: 18 },
  status: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  videoMoreButton: {
    position: "absolute",
    top: 10,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.55)",
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
