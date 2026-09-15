import { listVideos, getVideoPlayback, recordVideoView } from "@/services/videos";
import VideoCaption from "@/components/video/video-caption";
import type { VideoItem } from "@/types/video";
import { useEventListener } from "expo";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FeedVideo = VideoItem & { playbackUrl: string };

export default function HomeVideoFeed({ token, focused = true }: { token: string | null; focused?: boolean }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCaptionVisible, setIsCaptionVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
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
    if (!token) {
      setVideos([]);
      return;
    }

    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    void (async () => {
      try {
        const response = await listVideos(token);
        const shuffled = [...response.data].sort(() => Math.random() - 0.5);
        const resolvePlayable = async (video: VideoItem): Promise<FeedVideo | null> => {
          try {
            const playback = await getVideoPlayback(token, video.id);
            return { ...video, playbackUrl: playback.data.url };
          } catch (error) {
            console.error("[HomeVideoFeed] Видеото не може да бъде подготвено за възпроизвеждане.", { videoId: video.id, error });
            return null;
          }
        };

        let firstPlayable: FeedVideo | null = null;
        let firstIndex = 0;
        for (; firstIndex < shuffled.length; firstIndex += 1) {
          firstPlayable = await resolvePlayable(shuffled[firstIndex]);
          if (firstPlayable) break;
        }

        if (currentRequestId === requestId.current && firstPlayable) {
          setVideos([firstPlayable]);
          setActiveIndex(0);
          setIsLoading(false);
        }

        const remaining = shuffled.slice(firstPlayable ? firstIndex + 1 : 0);
        const playable = await Promise.all(remaining.map(resolvePlayable));
        if (currentRequestId === requestId.current) {
          setVideos((current) => [...current, ...playable.filter((video): video is FeedVideo => video !== null)]);
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
  }, [token]);

  const onMomentumScrollEnd = useCallback((offsetY: number) => {
    setActiveIndex(Math.max(0, Math.round(offsetY / height)));
    setIsCaptionVisible(false);
    if (captionTimer.current) {
      clearTimeout(captionTimer.current);
      captionTimer.current = null;
    }
  }, [height]);

  if (!token || (!isLoading && videos.length === 0)) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {isLoading && videos.length === 0 ? <ActivityIndicator style={styles.loader} size="large" color="#ffffff" /> : null}
      <FlatList
        data={videos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <HomeVideoCard
            video={item}
            active={focused && index === activeIndex && !isFullscreen}
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
                video={item}
                active={focused && index === fullscreenIndex}
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
  width,
  height,
  captionVisible,
  onToggleCaption,
  showCaption = true,
  onViewVideo,
}: {
  video: FeedVideo;
  active: boolean;
  width: number;
  height: number;
  captionVisible: boolean;
  onToggleCaption: () => void;
  showCaption?: boolean;
  onViewVideo?: (videoId: number) => void;
}) {
  const player = useVideoPlayer(video.playbackUrl, (instance) => {
    instance.loop = true;
    instance.muted = false;
  });
  const [isReady, setIsReady] = useState(player.status === "readyToPlay");
  const viewCountedRef = useRef(false);

  useEventListener(player, "statusChange", ({ status }) => {
    setIsReady(status === "readyToPlay");
  });

  useEffect(() => {
    if (active) {
      player.play();
      if (isReady && !viewCountedRef.current) {
        viewCountedRef.current = true;
        onViewVideo?.(video.id);
      }
    } else {
      player.pause();
      viewCountedRef.current = false;
    }
  }, [active, isReady, onViewVideo, player, video.id]);

  return (
    <View style={{ width, height }}>
      <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
      {video.thumbnail_url && !isReady ? (
        <Image
          source={{ uri: video.thumbnail_url }}
          style={styles.thumbnail}
          contentFit="cover"
          cachePolicy="memory-disk"
          pointerEvents="none"
        />
      ) : null}
      {showCaption ? (
        <>
          <Pressable
            style={styles.touchLayer}
            onPress={onToggleCaption}
            accessibilityRole="button"
            accessibilityLabel="Покажи заглавието и описанието"
          />
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
  video: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
  thumbnail: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
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
  touchLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "transparent",
  },
});
