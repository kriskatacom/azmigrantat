import { getVideoPlayback, listPublicVideos, recordVideoView } from "@/services/videos";
import VideoCaption from "@/components/video/video-caption";
import ControlledVideoPlayer from "@/components/video/controlled-video-player";
import type { PublicVideoItem } from "@/types/video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, FlatList, Modal, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from "react-native-svg";
import type { VideoPlaybackFailureReason } from "@/services/video-playback-errors";
import { showReportDialog } from "@/services/report-dialog";
import { FontAwesome } from "@expo/vector-icons";

type FeedVideo = PublicVideoItem & { playbackUrl: string };
type ActiveVideoUser = PublicVideoItem["user"];
const SWIPE_VELOCITY_THRESHOLD = 0.08;
const HOME_PROGRESS_CAPTION_OFFSET = 15;
const HOME_CAPTION_BOTTOM_OFFSET = 134;
const HOME_PROGRESS_BOTTOM_OFFSET = 105;
const PLAYBACK_REFRESH_THROTTLE_MS = 30_000;
const FULLSCREEN_OPEN_SCALE = 1.035;
const FULLSCREEN_CLOSE_SCALE = 0.985;
const FULLSCREEN_CLOSE_PINCH_THRESHOLD = 0.88;
const ZOOM_ANIMATION_DURATION_MS = 240;

export default function HomeVideoFeed({
  token,
  focused = true,
  onActiveVideoUserChange,
}: {
  token: string | null;
  focused?: boolean;
  onActiveVideoUserChange?: (user: ActiveVideoUser) => void;
}) {
  const { height, width } = useWindowDimensions();
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isActiveVideoPlaying, setIsActiveVideoPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const listRef = useRef<FlatList<FeedVideo>>(null);
  const fullscreenListRef = useRef<FlatList<FeedVideo>>(null);
  const activeIndexRef = useRef(0);
  const requestId = useRef(0);
  const playbackRefreshState = useRef(new Map<number, { inFlight: boolean; lastAttemptAt: number }>());
  const feedPinchScale = useSharedValue(1);
  const fullscreenScale = useSharedValue(1);

  const finishClosingFullscreen = useCallback(() => {
    setIsFullscreen(false);
    fullscreenScale.set(1);
  }, [fullscreenScale]);

  const openFullscreen = useCallback((index: number) => {
    fullscreenScale.set(FULLSCREEN_OPEN_SCALE);
    setFullscreenIndex(index);
    setIsFullscreen(true);
  }, [fullscreenScale]);

  const closeFullscreen = useCallback(() => {
    fullscreenScale.set(withTiming(
      FULLSCREEN_CLOSE_SCALE,
      {
        duration: ZOOM_ANIMATION_DURATION_MS - 60,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) runOnJS(finishClosingFullscreen)();
      },
    ));
  }, [finishClosingFullscreen, fullscreenScale]);

  useEffect(() => {
    if (!isFullscreen) return;
    fullscreenScale.set(withTiming(1, {
      duration: ZOOM_ANIMATION_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    }));
  }, [fullscreenScale, isFullscreen]);

  const feedZoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: feedPinchScale.get() }],
  }));

  const fullscreenZoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fullscreenScale.get() }],
  }));

  useEffect(() => {
    if (!focused) {
      setIsFullscreen(false);
      setIsActiveVideoPlaying(true);
    }
  }, [focused]);

  useEffect(() => {
    onActiveVideoUserChange?.(videos[activeIndex]?.user ?? null);
  }, [activeIndex, onActiveVideoUserChange, videos]);

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
        const response = await listPublicVideos();
        const playable = response.data.flatMap((video): FeedVideo[] => (
          video.playback_url ? [{ ...video, playbackUrl: video.playback_url }] : []
        ));

        if (currentRequestId === requestId.current) {
          setVideos(playable);
          activeIndexRef.current = 0;
          setActiveIndex(0);
        }
      } catch (error) {
        console.error("[HomeVideoFeed] Feed-ът с видеа не може да бъде зареден.", error);
      } finally {
        if (currentRequestId === requestId.current) setIsLoading(false);
      }
    })();

    return () => {
      requestId.current += 1;
    };
  }, []);

  const onMomentumScrollEnd = useCallback((offsetY: number) => {
    const index = Math.max(0, Math.min(videos.length - 1, Math.round(offsetY / height)));
    activeIndexRef.current = index;
    setActiveIndex(index);
    setIsActiveVideoPlaying(true);
  }, [height, videos.length]);

  const onScrollEndDrag = useCallback((velocityY: number) => {
    if (Math.abs(velocityY) < SWIPE_VELOCITY_THRESHOLD || videos.length < 2) return;
    const nextIndex = Math.max(
      0,
      Math.min(videos.length - 1, activeIndexRef.current + (velocityY > 0 ? -1 : 1)),
    );
    if (nextIndex === activeIndexRef.current) return;
    activeIndexRef.current = nextIndex;
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  }, [videos.length]);

  const pinchToFullscreenGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          feedPinchScale.set(Math.min(1.06, Math.max(1, event.scale)));
        })
        .onEnd((event) => {
          feedPinchScale.set(withTiming(1, {
            duration: ZOOM_ANIMATION_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          }));
          if (event.scale >= 1.15 && !isFullscreen) {
            runOnJS(openFullscreen)(activeIndex);
          }
        }),
    [activeIndex, feedPinchScale, isFullscreen, openFullscreen],
  );

  const pinchToCloseFullscreenGesture = useMemo(
    () =>
      Gesture.Pinch()
        .shouldCancelWhenOutside(false)
        .onUpdate((event) => {
          const nextScale = Math.min(1, Math.max(FULLSCREEN_CLOSE_SCALE, event.scale));
          fullscreenScale.set(nextScale);
        })
        .onEnd((event) => {
          if (event.scale <= FULLSCREEN_CLOSE_PINCH_THRESHOLD) {
            fullscreenScale.set(withTiming(
              FULLSCREEN_CLOSE_SCALE,
              {
                duration: ZOOM_ANIMATION_DURATION_MS - 60,
                easing: Easing.in(Easing.cubic),
              },
              (finished) => {
                if (finished) runOnJS(finishClosingFullscreen)();
              },
            ));
            return;
          }

          fullscreenScale.set(withTiming(1, {
            duration: ZOOM_ANIMATION_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          }));
        }),
    [finishClosingFullscreen, fullscreenScale],
  );

  const fullscreenGesture = useMemo(
    () => Gesture.Simultaneous(pinchToCloseFullscreenGesture, Gesture.Native()),
    [pinchToCloseFullscreenGesture],
  );

  if (!isLoading && videos.length === 0) return null;

  return (
    <GestureDetector gesture={pinchToFullscreenGesture}>
      <Animated.View style={[styles.container, feedZoomStyle]} pointerEvents="box-none">
        {isLoading && videos.length === 0 ? <ActivityIndicator style={styles.loader} size="large" color="#ffffff" /> : null}
        <FlatList
          ref={listRef}
          data={videos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <HomeVideoCard
              key={`${item.id}-${token ? "audio" : "autoplay"}`}
              video={item}
              active={focused && index === activeIndex && !isFullscreen}
              muted={false}
              width={width}
              height={height}
              captionVisible={index === activeIndex}
              isPlaying={index === activeIndex ? isActiveVideoPlaying : true}
              captionBottomOffset={HOME_CAPTION_BOTTOM_OFFSET}
              progressBottomOffset={HOME_PROGRESS_BOTTOM_OFFSET}
              onPlaybackChange={index === activeIndex ? setIsActiveVideoPlaying : undefined}
              onViewVideo={handleViewVideo}
              onPlaybackError={handlePlaybackError}
              onReport={token ? (videoId) => showReportDialog(token, "video", videoId) : undefined}
            />
          )}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          onScrollEndDrag={(event) => onScrollEndDrag(event.nativeEvent.velocity?.y ?? 0)}
          onMomentumScrollEnd={(event) => onMomentumScrollEnd(event.nativeEvent.contentOffset.y)}
        />
        <Modal
          visible={isFullscreen}
          animationType="fade"
          presentationStyle="fullScreen"
          onRequestClose={closeFullscreen}
        >
          <GestureHandlerRootView style={styles.fullscreenScreen}>
            <GestureDetector gesture={fullscreenGesture}>
              <Animated.View style={[styles.fullscreenScreen, fullscreenZoomStyle]}>
              <FlatList
              ref={fullscreenListRef}
              data={videos}
              keyExtractor={(item) => `fullscreen-${item.id}`}
              renderItem={({ item, index }) => (
                <HomeVideoCard
                  key={`${item.id}-${token ? "audio" : "autoplay"}`}
                  video={item}
                  active={focused && index === fullscreenIndex}
                  muted={false}
                  width={width}
                  height={height}
                  captionVisible={index === fullscreenIndex}
                  isPlaying
                  captionBottomOffset={32}
                  showCaption={false}
                  showOverlays={false}
                  showProgress
                  onViewVideo={handleViewVideo}
                  onPlaybackError={handlePlaybackError}
                  onReport={token ? (videoId) => showReportDialog(token, "video", videoId) : undefined}
                />
              )}
              getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
              initialScrollIndex={fullscreenIndex}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              decelerationRate="fast"
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              onScrollEndDrag={(event) => {
                const velocityY = event.nativeEvent.velocity?.y ?? 0;
                if (Math.abs(velocityY) < SWIPE_VELOCITY_THRESHOLD || videos.length < 2) return;

                const nextIndex = Math.max(
                  0,
                  Math.min(videos.length - 1, fullscreenIndex + (velocityY > 0 ? -1 : 1)),
                );
                if (nextIndex === fullscreenIndex) return;

                setFullscreenIndex(nextIndex);
                fullscreenListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
              }}
              onMomentumScrollEnd={(event) => {
                setFullscreenIndex(Math.max(0, Math.round(event.nativeEvent.contentOffset.y / height)));
              }}
                />
              </Animated.View>
            </GestureDetector>
          </GestureHandlerRootView>
        </Modal>
      </Animated.View>
    </GestureDetector>
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
  onPlaybackError,
  onReport,
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
  onPlaybackError?: (videoId: number, reason: VideoPlaybackFailureReason) => void;
  onReport?: (videoId: number) => void;
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
            title={video.user?.name ?? ""}
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
          />
        </>
      ) : null}
      {onReport ? (
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => onReport(video.id)}
          accessibilityRole="button"
          accessibilityLabel="Докладвай видеото"
        >
          <FontAwesome name="flag" size={18} color="#ffffff" />
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
  videoBottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
    zIndex: 5,
  },
  reportButton: {
    position: "absolute",
    top: 132,
    right: 18,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  fullscreenScreen: { flex: 1, backgroundColor: "#000" },
});
