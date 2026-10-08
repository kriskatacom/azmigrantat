import { listPublicVideos, recordVideoView } from "@/services/videos";
import VideoCaption from "@/components/video/video-caption";
import ControlledVideoPlayer from "@/components/video/controlled-video-player";
import type { PublicVideoItem } from "@/types/video";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Animated, FlatList, Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FeedVideo = PublicVideoItem & { playbackUrl: string };
type ActiveVideoUser = PublicVideoItem["user"];
const SWIPE_VELOCITY_THRESHOLD = 0.08;

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
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isActiveVideoPlaying, setIsActiveVideoPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [isFullscreenVideoPlaying, setIsFullscreenVideoPlaying] = useState(true);
  const fullscreenButtonOpacity = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<FeedVideo>>(null);
  const fullscreenListRef = useRef<FlatList<FeedVideo>>(null);
  const activeIndexRef = useRef(0);
  const requestId = useRef(0);

  useEffect(() => {
    Animated.timing(fullscreenButtonOpacity, {
      toValue: isFullscreen && !isFullscreenVideoPlaying ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fullscreenButtonOpacity, isFullscreen, isFullscreenVideoPlaying]);

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

  if (!isLoading && videos.length === 0) return null;

  return (
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
      <Pressable
        style={[styles.fullscreenButton, { top: 100 }]}
        onPress={() => {
          setFullscreenIndex(activeIndex);
          setIsFullscreenVideoPlaying(true);
          setIsFullscreen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Отвори видеото на цял екран"
      >
        <Ionicons name="expand-outline" size={25} color="#ffffff" />
      </Pressable>
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
                isPlaying={index === fullscreenIndex ? isFullscreenVideoPlaying : true}
                captionBottomOffset={32}
                showCaption
                onViewVideo={handleViewVideo}
                onPlaybackChange={index === fullscreenIndex ? setIsFullscreenVideoPlaying : undefined}
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
              setIsFullscreenVideoPlaying(true);
              fullscreenListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
            }}
            onMomentumScrollEnd={(event) => {
              setFullscreenIndex(Math.max(0, Math.round(event.nativeEvent.contentOffset.y / height)));
              setIsFullscreenVideoPlaying(true);
            }}
          />
          <Animated.View
            pointerEvents={isFullscreenVideoPlaying ? "none" : "auto"}
            style={[
              styles.exitFullscreenButton,
              { top: Math.max(insets.top + 12, 20), opacity: fullscreenButtonOpacity },
            ]}
          >
            <Pressable
              style={styles.exitFullscreenTouchTarget}
              onPress={() => setIsFullscreen(false)}
              accessibilityRole="button"
              accessibilityLabel="Върни нормалния режим"
            >
              <Ionicons name="contract-outline" size={25} color="#ffffff" />
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
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
  showCaption = true,
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
        controlsBottomOffset={showCaption ? 160 : 0}
        showControls={false}
        onVideoPress={() => setCaptionInteractionKey((key) => key + 1)}
        onPlaybackChange={onPlaybackChange}
        onViewVideo={() => onViewVideo?.(video.id)}
        videoId={video.id}
      />
      {showCaption ? (
        <>
          <VideoCaption
            title={video.title}
            description={video.description ?? null}
            visible={captionVisible}
            height="45%"
            maxHeight={height * 0.45}
            allowExpand
            fitContent
            bottomOffset={captionBottomOffset}
            topOffset={120}
            interactionKey={captionInteractionKey}
            isPlaying={isPlaying}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
  loader: { ...StyleSheet.absoluteFill, zIndex: 1 },
  fullscreenScreen: { flex: 1, backgroundColor: "#000" },
  fullscreenButton: {
    position: "absolute",
    right: 18,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    zIndex: 10,
    elevation: 0,
  },
  exitFullscreenButton: {
    position: "absolute",
    right: 18,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  exitFullscreenTouchTarget: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
