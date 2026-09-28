import { listPublicVideos, recordVideoView } from "@/services/videos";
import VideoCaption from "@/components/video/video-caption";
import ControlledVideoPlayer from "@/components/video/controlled-video-player";
import type { PublicVideoItem } from "@/types/video";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FeedVideo = PublicVideoItem & { playbackUrl: string };
type ActiveVideoUser = PublicVideoItem["user"];

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
  const [isCaptionVisible, setIsCaptionVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const listRef = useRef<FlatList<FeedVideo>>(null);
  const activeIndexRef = useRef(0);
  const requestId = useRef(0);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (captionTimer.current) clearTimeout(captionTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!focused) {
      setIsFullscreen(false);
      setIsCaptionVisible(false);
      if (captionTimer.current) {
        clearTimeout(captionTimer.current);
        captionTimer.current = null;
      }
    }
  }, [focused]);

  useEffect(() => {
    onActiveVideoUserChange?.(videos[activeIndex]?.user ?? null);
  }, [activeIndex, onActiveVideoUserChange, videos]);

  const toggleCaption = useCallback(() => {
    const nextVisible = !isCaptionVisible;
    setIsCaptionVisible(nextVisible);
    if (captionTimer.current) clearTimeout(captionTimer.current);
    captionTimer.current = nextVisible
      ? setTimeout(() => {
          setIsCaptionVisible(false);
          captionTimer.current = null;
        }, 3_000)
      : null;
  }, [isCaptionVisible]);

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
    setIsCaptionVisible(false);
    if (captionTimer.current) {
      clearTimeout(captionTimer.current);
      captionTimer.current = null;
    }
  }, [height, videos.length]);

  const onScrollEndDrag = useCallback((velocityY: number) => {
    if (Math.abs(velocityY) < 0.12 || videos.length < 2) return;
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
            captionVisible={isCaptionVisible}
            onToggleCaption={toggleCaption}
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
        style={[styles.fullscreenButton, { top: 128 }]}
        onPress={() => {
          setFullscreenIndex(activeIndex);
          setIsFullscreen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Отвори видеото на цял екран"
      >
        <Ionicons name="expand-outline" size={24} color="#ffffff" />
      </Pressable>
      <Modal
        visible={isFullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenScreen}>
          <FlatList
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
                captionVisible={false}
                onToggleCaption={() => undefined}
                showCaption={false}
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
            onMomentumScrollEnd={(event) => {
              setFullscreenIndex(Math.max(0, Math.round(event.nativeEvent.contentOffset.y / height)));
            }}
          />
          <Pressable
            style={[styles.exitFullscreenButton, { top: Math.max(insets.top + 12, 20) }]}
            onPress={() => setIsFullscreen(false)}
            accessibilityRole="button"
            accessibilityLabel="Върни нормалния режим"
          >
            <Ionicons name="contract-outline" size={24} color="#ffffff" />
          </Pressable>
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
  onToggleCaption,
  showCaption = true,
  onViewVideo,
}: {
  video: FeedVideo;
  active: boolean;
  muted: boolean;
  width: number;
  height: number;
  captionVisible: boolean;
  onToggleCaption: () => void;
  showCaption?: boolean;
  onViewVideo?: (videoId: number) => void;
}) {
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
        showControls={!showCaption}
        onVideoPress={onToggleCaption}
        onViewVideo={() => onViewVideo?.(video.id)}
        videoId={video.id}
      />
      {showCaption ? (
        <>
          <VideoCaption
            title={video.title}
            description={video.description ?? null}
            visible={captionVisible}
            height="35%"
            maxHeight={height * 0.35}
            allowExpand
            fitContent
            bottomOffset={160}
            topOffset={120}
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
    zIndex: 10,
    elevation: 10,
  },
  exitFullscreenButton: {
    position: "absolute",
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
  },
});
