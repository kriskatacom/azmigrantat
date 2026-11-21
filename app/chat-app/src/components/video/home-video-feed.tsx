import {
  getSavedVideoIds,
  getVideoPlayback,
  listPublicVideos,
  recordVideoView,
  saveVideoForUser,
  unsaveVideoForUser,
} from "@/services/videos";
import VideoCaption from "@/components/video/video-caption";
import ControlledVideoPlayer from "@/components/video/controlled-video-player";
import PublicVideoPager from "@/components/video/public-video-pager";
import TikTokVideoGestureSurface from "@/components/video/tiktok-video-gesture-surface";
import type { PublicVideoItem } from "@/types/video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from "react-native-svg";
import type { VideoPlaybackFailureReason } from "@/services/video-playback-errors";
import { Feather, FontAwesome } from "@expo/vector-icons";
import VideoCommentsSheet from "@/components/video/video-comments-sheet";
import { useRouter } from "expo-router";
import {
  FEATURED_HOME_VIDEO_ID,
  shouldHideVideoSocialActions,
  shouldHideVideoUploader,
} from "@/constants/featured-video";

type FeedVideo = PublicVideoItem & { playbackUrl: string };
type ActiveVideoUser = PublicVideoItem["user"];
const HOME_PROGRESS_CAPTION_OFFSET = 15;
const HOME_CAPTION_BOTTOM_OFFSET = 134;
const HOME_PROGRESS_BOTTOM_OFFSET = 105;
const PLAYBACK_REFRESH_THROTTLE_MS = 30_000;
const FEED_PAGE_SIZE = 12;
const FEED_PREFETCH_DISTANCE = 3;

export default function HomeVideoFeed({
  token,
  focused = true,
  resetSignal = 0,
  onActiveVideoIdChange,
  onActiveVideoUserChange,
}: {
  token: string | null;
  focused?: boolean;
  resetSignal?: number;
  onActiveVideoIdChange?: (videoId: number | null) => void;
  onActiveVideoUserChange?: (user: ActiveVideoUser) => void;
}) {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isActiveVideoPlaying, setIsActiveVideoPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isCaptionScrolling, setIsCaptionScrolling] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [commentsVideoId, setCommentsVideoId] = useState<number | null>(null);
  const [savedVideoIds, setSavedVideoIds] = useState<Set<number>>(() => new Set());
  const [savingVideoIds, setSavingVideoIds] = useState<Set<number>>(() => new Set());
  const listRef = useRef<FlatList<FeedVideo>>(null);
  const videosRef = useRef<FeedVideo[]>([]);
  const requestId = useRef(0);
  const pageRef = useRef(0);
  const seedRef = useRef<number | null>(null);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const videoIdsRef = useRef(new Set<number>());
  const playbackRefreshState = useRef(new Map<number, { inFlight: boolean; lastAttemptAt: number }>());

  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  const resetToFeaturedVideo = useCallback(() => {
    const featuredIndex = videosRef.current.findIndex(
      (video) => video.id === FEATURED_HOME_VIDEO_ID,
    );
    if (featuredIndex < 0) return;

    setActiveIndex(featuredIndex);
    setIsActiveVideoPlaying(true);
    setIsZooming(false);
    setIsScrubbing(false);
    setIsCaptionScrolling(false);
    setFullscreenIndex(null);
    setCommentsVideoId(null);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: featuredIndex, animated: false });
    });
  }, []);

  useEffect(() => {
    if (focused) resetToFeaturedVideo();
  }, [focused, resetSignal, resetToFeaturedVideo]);

  useEffect(() => {
    if (!focused) {
      setIsZooming(false);
      setIsScrubbing(false);
      setIsCaptionScrolling(false);
      setFullscreenIndex(null);
      setCommentsVideoId(null);
      setIsActiveVideoPlaying(true);
    }
  }, [focused]);

  const loadedVideoIdsKey = useMemo(() => videos.map((video) => video.id).join(","), [videos]);

  useEffect(() => {
    if (!token || !loadedVideoIdsKey) {
      setSavedVideoIds(new Set());
      return;
    }

    let cancelled = false;
    const loadedIds = loadedVideoIdsKey.split(",").map(Number).filter((id) => Number.isInteger(id));
    void getSavedVideoIds(token, loadedIds)
      .then(({ data }) => {
        if (cancelled) return;
        const loadedIdSet = new Set(loadedIds);
        setSavedVideoIds((current) => {
          const next = new Set([...current].filter((id) => !loadedIdSet.has(id)));
          data.video_ids.forEach((id) => next.add(id));
          return next;
        });
      })
      .catch((error) => {
        console.warn("[HomeVideoFeed] Запазените видеа не можаха да бъдат проверени.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [loadedVideoIdsKey, token]);

  useEffect(() => {
    onActiveVideoIdChange?.(videos[activeIndex]?.id ?? null);
    onActiveVideoUserChange?.(videos[activeIndex]?.user ?? null);
  }, [activeIndex, onActiveVideoIdChange, onActiveVideoUserChange, videos]);

  const handleViewVideo = useCallback((videoId: number) => {
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
        console.warn("[HomeVideoFeed] Гледането не можа да бъде отчетено.", { videoId, error });
      });
  }, [token]);

  const toggleSavedVideo = useCallback(async (videoId: number) => {
    if (!token || savingVideoIds.has(videoId)) return;
    const wasSaved = savedVideoIds.has(videoId);

    setSavingVideoIds((current) => new Set(current).add(videoId));
    setSavedVideoIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(videoId); else next.add(videoId);
      return next;
    });

    try {
      if (wasSaved) await unsaveVideoForUser(token, videoId);
      else await saveVideoForUser(token, videoId);
    } catch (error) {
      setSavedVideoIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.add(videoId); else next.delete(videoId);
        return next;
      });
      Alert.alert(
        "Видеото не беше запазено",
        error instanceof Error ? error.message : "Опитайте отново.",
      );
    } finally {
      setSavingVideoIds((current) => {
        const next = new Set(current);
        next.delete(videoId);
        return next;
      });
    }
  }, [savedVideoIds, savingVideoIds, token]);

  const requestAuthentication = useCallback(() => {
    router.push({
      pathname: "/(auth)/login",
      params: { returnTo: "/" },
    });
  }, [router]);

  const openComments = useCallback((videoId: number) => {
    if (!token) {
      requestAuthentication();
      return;
    }
    setCommentsVideoId(videoId);
  }, [requestAuthentication, token]);

  const requestToggleSaved = useCallback((videoId: number) => {
    if (!token) {
      requestAuthentication();
      return;
    }
    void toggleSavedVideo(videoId);
  }, [requestAuthentication, toggleSavedVideo, token]);

  const loadMoreVideos = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    const currentRequestId = requestId.current;

    try {
      let nextPage = pageRef.current + 1;
      let appended: FeedVideo[] = [];

      // A page may contain videos whose storage provider cannot issue a
      // playback URL. Continue until at least one playable item is found or
      // the backend confirms that the feed is exhausted.
      while (appended.length === 0 && hasMoreRef.current) {
        const response = await listPublicVideos("", undefined, undefined, undefined, {
          page: nextPage,
          limit: FEED_PAGE_SIZE,
          ...(seedRef.current !== null ? { seed: seedRef.current } : {}),
        });
        if (currentRequestId !== requestId.current) return;

        seedRef.current = response.pagination.seed;
        pageRef.current = response.pagination.page;
        hasMoreRef.current = response.pagination.has_more;
        nextPage = response.pagination.page + 1;
        const playable = response.data.flatMap((video): FeedVideo[] => (
          video.playback_url ? [{ ...video, playbackUrl: video.playback_url }] : []
        ));
        appended = playable.filter((video) => !videoIdsRef.current.has(video.id));
      }

      if (appended.length > 0 && currentRequestId === requestId.current) {
        appended.forEach((video) => videoIdsRef.current.add(video.id));
        setVideos((current) => {
          const existingIds = new Set(current.map((video) => video.id));
          return [...current, ...appended.filter((video) => !existingIds.has(video.id))];
        });
      }
    } catch (error) {
      console.error("[HomeVideoFeed] Следващите видеа не можаха да бъдат заредени.", error);
    } finally {
      if (currentRequestId === requestId.current) {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, []);

  const handlePlaybackError = useCallback((videoId: number, reason: VideoPlaybackFailureReason) => {
    if (reason !== "forbidden") return;

    const now = Date.now();
    const currentState = playbackRefreshState.current.get(videoId);
    if (
      currentState?.inFlight ||
      (currentState && now - currentState.lastAttemptAt < PLAYBACK_REFRESH_THROTTLE_MS)
    ) {
      return;
    }

    playbackRefreshState.current.set(videoId, { inFlight: true, lastAttemptAt: now });
    void (async () => {
      try {
        const freshUrl = token
          ? (await getVideoPlayback(token, videoId)).data.url
          : (await listPublicVideos()).data.find((video) => video.id === videoId)?.playback_url;

        if (!freshUrl) return;
        setVideos((current) => current.map((video) => (
          video.id === videoId ? { ...video, playbackUrl: freshUrl } : video
        )));
      } catch {
        console.info("[HomeVideoFeed] Playback URL refresh failed.", { videoId });
      } finally {
        playbackRefreshState.current.set(videoId, {
          inFlight: false,
          lastAttemptAt: Date.now(),
        });
      }
    })();
  }, [token]);

  useEffect(() => {
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    void (async () => {
      try {
        const [featuredResponse, initialResponse] = await Promise.all([
          listPublicVideos("", undefined, undefined, undefined, {
            page: 1,
            limit: 1,
            videoId: FEATURED_HOME_VIDEO_ID,
          }),
          listPublicVideos("", undefined, undefined, undefined, {
            page: 1,
            limit: FEED_PAGE_SIZE,
          }),
        ]);
        let response = initialResponse;
        let playable = response.data.flatMap((video): FeedVideo[] => (
          video.playback_url ? [{ ...video, playbackUrl: video.playback_url }] : []
        ));

        while (playable.length === 0 && response.pagination.has_more) {
          response = await listPublicVideos("", undefined, undefined, undefined, {
            page: response.pagination.page + 1,
            limit: FEED_PAGE_SIZE,
            seed: response.pagination.seed,
          });
          playable = response.data.flatMap((video): FeedVideo[] => (
            video.playback_url ? [{ ...video, playbackUrl: video.playback_url }] : []
          ));
        }

        const featured = featuredResponse.data.find(
          (video) => video.id === FEATURED_HOME_VIDEO_ID && video.playback_url,
        );
        if (featured?.playback_url) {
          playable = [
            { ...featured, playbackUrl: featured.playback_url },
            ...playable.filter((video) => video.id !== FEATURED_HOME_VIDEO_ID),
          ];
        }

        if (currentRequestId === requestId.current) {
          setVideos(playable);
          videoIdsRef.current = new Set(playable.map((video) => video.id));
          pageRef.current = response.pagination.page;
          seedRef.current = response.pagination.seed;
          hasMoreRef.current = response.pagination.has_more;
          setActiveIndex(0);
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          });
        }
      } catch (error) {
        console.error("[HomeVideoFeed] Feed-ът с видеа не може да бъде зареден.", error);
      } finally {
        if (currentRequestId === requestId.current) setIsLoading(false);
      }
    })();

    return () => {
      requestId.current += 1;
      loadingMoreRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      videos.length > 0 &&
      activeIndex >= Math.max(0, videos.length - FEED_PREFETCH_DISTANCE)
    ) {
      void loadMoreVideos();
    }
  }, [activeIndex, loadMoreVideos, videos.length]);

  const onMomentumScrollEnd = useCallback((offsetY: number) => {
    const index = Math.max(0, Math.min(videos.length - 1, Math.round(offsetY / height)));
    setActiveIndex(index);
    setIsActiveVideoPlaying(true);
  }, [height, videos.length]);
  const fullscreenVideos = useMemo(() => videos.map((video) => ({
    ...video,
    playback_url: video.playbackUrl,
  })), [videos]);
  const exitFullscreenAtIndex = useCallback((index: number) => {
    setFullscreenIndex(null);
    setActiveIndex(index);
    setIsActiveVideoPlaying(true);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated: false });
    });
  }, []);
  const closeFullscreen = useCallback(() => {
    exitFullscreenAtIndex(fullscreenIndex ?? activeIndex);
  }, [activeIndex, exitFullscreenAtIndex, fullscreenIndex]);

  if (!isLoading && videos.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {isLoading && videos.length === 0 ? <ActivityIndicator style={styles.loader} size="large" color="#ffffff" /> : null}
      <FlatList
        ref={listRef}
        data={videos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <TikTokVideoGestureSurface
            active={focused && index === activeIndex}
            width={width}
            height={height}
            onZoomChange={index === activeIndex ? setIsZooming : undefined}
            onRequestFullscreen={() => setFullscreenIndex(index)}
          >
            <HomeVideoCard
              key={`${item.id}-${token ? "audio" : "autoplay"}`}
              video={item}
              active={focused && fullscreenIndex === null && index === activeIndex}
              muted={false}
              width={width}
              height={height}
              captionVisible={index === activeIndex}
              isPlaying={index === activeIndex ? isActiveVideoPlaying : true}
              captionBottomOffset={HOME_CAPTION_BOTTOM_OFFSET}
              progressBottomOffset={HOME_PROGRESS_BOTTOM_OFFSET}
              onPlaybackChange={index === activeIndex ? setIsActiveVideoPlaying : undefined}
              onScrubbingChange={index === activeIndex ? setIsScrubbing : undefined}
              onCaptionScrollChange={index === activeIndex ? setIsCaptionScrolling : undefined}
              onViewVideo={handleViewVideo}
              onPlaybackError={handlePlaybackError}
              onOpenComments={openComments}
              saved={savedVideoIds.has(item.id)}
              saving={savingVideoIds.has(item.id)}
              onToggleSaved={requestToggleSaved}
            />
          </TikTokVideoGestureSurface>
        )}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        disableIntervalMomentum
        scrollEnabled={!isZooming && !isScrubbing && !isCaptionScrolling}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        onMomentumScrollEnd={(event) => onMomentumScrollEnd(event.nativeEvent.contentOffset.y)}
        onEndReached={() => void loadMoreVideos()}
        onEndReachedThreshold={0.8}
      />
      {isLoadingMore ? <ActivityIndicator pointerEvents="none" style={styles.loadMoreIndicator} size="small" color="#ffffff" /> : null}
      <PublicVideoPager
        visible={fullscreenIndex !== null}
        videos={fullscreenVideos}
        initialIndex={fullscreenIndex ?? activeIndex}
        onActiveIndexChange={exitFullscreenAtIndex}
        onRequestExitFullscreen={closeFullscreen}
        onClose={closeFullscreen}
        colors={{ background: "#000000", text: "#ffffff", textSecondary: "#c7c7c7" }}
        token={token}
        onRequireAuthentication={requestAuthentication}
        onCommentCountChange={(videoId, nextCount) => setVideos((current) => current.map((video) => (
          video.id === videoId ? { ...video, comments_count: nextCount } : video
        )))}
        savedVideoIds={savedVideoIds}
        savingVideoIds={savingVideoIds}
        onToggleSaved={requestToggleSaved}
      />
      {token ? (
        <VideoCommentsSheet
          visible={commentsVideoId !== null}
          token={token}
          videoId={commentsVideoId}
          initialCount={videos.find((video) => video.id === commentsVideoId)?.comments_count ?? 0}
          onClose={() => setCommentsVideoId(null)}
          onCountChange={(nextCount) => setVideos((current) => current.map((video) => (
            video.id === commentsVideoId ? { ...video, comments_count: nextCount } : video
          )))}
          onOpenProfile={(userId) => {
            setCommentsVideoId(null);
            router.push({ pathname: "/user/[id]", params: { id: String(userId) } });
          }}
        />
      ) : null}
    </View>
  );
}

function HomeVideoCard({
  video,
  active,
  muted,
  width,
  height,
  captionVisible,
  isPlaying,
  captionBottomOffset,
  progressBottomOffset,
  showCaption = true,
  showOverlays = true,
  showProgress,
  onViewVideo,
  onPlaybackChange,
  onScrubbingChange,
  onCaptionScrollChange,
  onPlaybackError,
  onOpenComments,
  saved = false,
  saving = false,
  onToggleSaved,
}: {
  video: FeedVideo;
  active: boolean;
  muted: boolean;
  width: number;
  height: number;
  captionVisible: boolean;
  isPlaying: boolean;
  captionBottomOffset: number;
  progressBottomOffset?: number;
  showCaption?: boolean;
  showOverlays?: boolean;
  showProgress?: boolean;
  onViewVideo?: (videoId: number) => void;
  onPlaybackChange?: (isPlaying: boolean) => void;
  onScrubbingChange?: (isScrubbing: boolean) => void;
  onCaptionScrollChange?: (isScrolling: boolean) => void;
  onPlaybackError?: (videoId: number, reason: VideoPlaybackFailureReason) => void;
  onOpenComments?: (videoId: number) => void;
  saved?: boolean;
  saving?: boolean;
  onToggleSaved?: (videoId: number) => void;
}) {
  const [captionInteractionKey, setCaptionInteractionKey] = useState(0);

  return (
    <View style={{ width, height }}>
      <ControlledVideoPlayer
        url={video.playbackUrl}
        thumbnailUrl={video.thumbnail_url}
        active={active}
        muted={muted}
        loop
        contentFit="cover"
        controlsBottomOffset={
          progressBottomOffset ?? (showCaption && captionBottomOffset >= 100
            ? captionBottomOffset - HOME_PROGRESS_CAPTION_OFFSET
            : 16)
        }
        showControls={false}
        onVideoPress={() => setCaptionInteractionKey((key) => key + 1)}
        onPlaybackChange={onPlaybackChange}
        onScrubbingChange={onScrubbingChange}
        onViewVideo={() => onViewVideo?.(video.id)}
        onPlaybackError={(reason) => onPlaybackError?.(video.id, reason)}
        videoId={video.id}
        bottomOverlay={<HomeVideoBottomGradient />}
        showOverlays={showOverlays}
        showProgress={showProgress}
      />
      {showCaption ? (
        <>
          <VideoCaption
            title={shouldHideVideoUploader(video.id) ? "" : video.user?.name ?? ""}
            description={video.description?.trim() || null}
            visible={captionVisible}
            height="45%"
            maxHeight={height * 0.45}
            allowExpand
            fitContent
            bottomOffset={captionBottomOffset}
            topOffset={120}
            interactionKey={captionInteractionKey}
            isPlaying={isPlaying}
            rightInset={88}
            onDescriptionScrollChange={onCaptionScrollChange}
          />
        </>
      ) : null}
      {onOpenComments && !shouldHideVideoSocialActions(video.id) ? (
        <TouchableOpacity
          style={styles.commentButton}
          onPress={() => onOpenComments(video.id)}
          accessibilityRole="button"
          accessibilityLabel={`Коментари: ${video.comments_count ?? 0}`}
        >
          <Feather name="message-circle" size={30} color="#ffffff" />
          <Text style={styles.commentLabel}>Коментари</Text>
        </TouchableOpacity>
      ) : null}
      {onToggleSaved && !shouldHideVideoSocialActions(video.id) ? (
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.actionButtonDisabled]}
          onPress={() => onToggleSaved(video.id)}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ selected: saved, disabled: saving }}
          accessibilityLabel={saved ? "Премахни видеото от запазени" : "Запази видеото"}
        >
          <FontAwesome name={saved ? "bookmark" : "bookmark-o"} size={30} color="#ffffff" />
          <Text style={styles.actionLabel}>{saved ? "Запазено" : "Запазване"}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function HomeVideoBottomGradient() {
  return (
    <View pointerEvents="none" style={styles.videoBottomGradient}>
      <Svg width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="homeVideoBottomGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#000000" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#000000" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#homeVideoBottomGradient)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
  loader: { ...StyleSheet.absoluteFill, zIndex: 1 },
  loadMoreIndicator: { position: "absolute", right: 16, bottom: 116, zIndex: 30 },
  videoBottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
    zIndex: 5,
  },
  commentButton: {
    position: "absolute",
    right: 7,
    bottom: 206,
    zIndex: 22,
    width: 72,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    position: "absolute",
    right: 7,
    bottom: 140,
    zIndex: 22,
    width: 72,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  commentLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 3,
  },
  actionLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 3,
  },
});
