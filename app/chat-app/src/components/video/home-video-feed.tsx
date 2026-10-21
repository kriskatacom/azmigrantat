import { listPublicVideos, recordVideoView } from "@/services/videos";
import VideoCaption from "@/components/video/video-caption";
import ControlledVideoPlayer from "@/components/video/controlled-video-player";
import type { PublicVideoItem } from "@/types/video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ActivityIndicator, FlatList, Modal, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from "react-native-svg";

type FeedVideo = PublicVideoItem & { playbackUrl: string };
type ActiveVideoUser = PublicVideoItem["user"];
const SWIPE_VELOCITY_THRESHOLD = 0.08;
const HOME_PROGRESS_LOWER_OFFSET = 8;

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
        .runOnJS(true)
        .onEnd((event) => {
          if (event.scale < 1.15 || isFullscreen) return;
          setFullscreenIndex(activeIndex);
          setIsFullscreen(true);
        }),
    [activeIndex, isFullscreen],
  );

  if (!isLoading && videos.length === 0) return null;

  return (
    <GestureDetector gesture={pinchToFullscreenGesture}>
      <View style={styles.container} pointerEvents="box-none">
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
            muted={!token}
            width={width}
            height={height}
            captionVisible={index === activeIndex}
            isPlaying={index === activeIndex ? isActiveVideoPlaying : true}
            captionBottomOffset={120}
            onPlaybackChange={index === activeIndex ? setIsActiveVideoPlaying : undefined}
            onViewVideo={handleViewVideo}
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
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenScreen}>
          <FlatList
            ref={fullscreenListRef}
            data={videos}
            keyExtractor={(item) => `fullscreen-${item.id}`}
            renderItem={({ item, index }) => (
              <HomeVideoCard
                key={`${item.id}-${token ? "audio" : "autoplay"}`}
                video={item}
                active={focused && index === fullscreenIndex}
                muted={!token}
                width={width}
                height={height}
                captionVisible={index === fullscreenIndex}
                isPlaying
                captionBottomOffset={32}
                showCaption={false}
                showOverlays={false}
                onViewVideo={handleViewVideo}
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
        </View>
        </Modal>
      </View>
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
  showCaption = true,
  showOverlays = true,
  onViewVideo,
  onPlaybackChange,
}: {
  video: FeedVideo;
  active: boolean;
  muted: boolean;
  width: number;
  height: number;
  captionVisible: boolean;
  isPlaying: boolean;
  captionBottomOffset: number;
  showCaption?: boolean;
  showOverlays?: boolean;
  onViewVideo?: (videoId: number) => void;
  onPlaybackChange?: (isPlaying: boolean) => void;
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
          showCaption && captionBottomOffset >= 100
            ? captionBottomOffset - 19 - HOME_PROGRESS_LOWER_OFFSET
            : 16
        }
        showControls={false}
        onVideoPress={() => setCaptionInteractionKey((key) => key + 1)}
        onPlaybackChange={onPlaybackChange}
        onViewVideo={() => onViewVideo?.(video.id)}
        videoId={video.id}
        bottomOverlay={<HomeVideoBottomGradient />}
        showOverlays={showOverlays}
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
  fullscreenScreen: { flex: 1, backgroundColor: "#000" },
});
