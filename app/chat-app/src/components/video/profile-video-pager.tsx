import type { VideoItem } from "@/types/video";
import VideoCaption from "@/components/video/video-caption";
import ControlledVideoPlayer from "@/components/video/controlled-video-player";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

type PagerColors = {
  background: string;
  text: string;
  textSecondary: string;
};
const SWIPE_VELOCITY_THRESHOLD = 0.12;

type Props = {
  visible: boolean;
  videos: VideoItem[];
  initialIndex: number;
  playbackUrls: Record<number, string>;
  onRequestPlayback: (index: number) => void;
  onViewVideo?: (videoId: number) => void;
  onClose: () => void;
  colors: PagerColors;
};

export default function ProfileVideoPager({
  visible,
  videos,
  initialIndex,
  playbackUrls,
  onRequestPlayback,
  onViewVideo,
  onClose,
  colors,
}: Props) {
  const { height, width } = useWindowDimensions();
  const listRef = useRef<FlatList<VideoItem>>(null);
  const activeIndexRef = useRef(Math.max(0, initialIndex));
  const [activeIndex, setActiveIndex] = useState(Math.max(0, initialIndex));
  const [isActiveVideoPlaying, setIsActiveVideoPlaying] = useState(true);

  useEffect(() => {
    if (!visible || initialIndex < 0 || initialIndex === activeIndexRef.current) return;
    activeIndexRef.current = initialIndex;
    setActiveIndex(initialIndex);
    setIsActiveVideoPlaying(true);
    listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
  }, [initialIndex, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <FlatList
          ref={listRef}
          data={videos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <ProfileVideoSlide
              video={item}
              url={playbackUrls[item.id] ?? null}
              width={width}
              height={height}
              captionVisible={index === activeIndex && !isActiveVideoPlaying}
              onPlaybackChange={index === activeIndex ? setIsActiveVideoPlaying : undefined}
              onRequestPlayback={() => onRequestPlayback(index)}
              active={index === activeIndex}
              onViewVideo={onViewVideo}
            />
          )}
          getItemLayout={(_, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
          initialScrollIndex={Math.max(0, initialIndex)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          onScrollEndDrag={(event) => {
            const velocityY = event.nativeEvent.velocity?.y ?? 0;
            if (Math.abs(velocityY) < SWIPE_VELOCITY_THRESHOLD || videos.length < 2) return;
            const nextIndex = Math.max(
              0,
              Math.min(
                videos.length - 1,
                activeIndexRef.current + (velocityY > 0 ? -1 : 1),
              ),
            );
            if (nextIndex === activeIndexRef.current) return;
            activeIndexRef.current = nextIndex;
            listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
          }}
          onMomentumScrollEnd={(event) => {
            const index = Math.max(
              0,
              Math.min(
                videos.length - 1,
                Math.round(event.nativeEvent.contentOffset.y / height),
              ),
            );
            if (index === activeIndexRef.current) return;
            activeIndexRef.current = index;
            setActiveIndex(index);
            setIsActiveVideoPlaying(true);
            onRequestPlayback(index);
          }}
        />
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Затвори видеото"
        >
          <FontAwesome name="close" size={25} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function ProfileVideoSlide({
  video,
  url,
  width,
  height,
  captionVisible,
  onPlaybackChange,
  onRequestPlayback,
  active,
  onViewVideo,
}: {
  video: VideoItem;
  url: string | null;
  width: number;
  height: number;
  captionVisible: boolean;
  onPlaybackChange?: (isPlaying: boolean) => void;
  onRequestPlayback: () => void;
  active: boolean;
  onViewVideo?: (videoId: number) => void;
}) {
  return (
    <View style={[styles.slide, { width, height }]}>
      {url ? (
        <PlayableVideo
          url={url}
          thumbnailUrl={video.thumbnail_url}
          active={active}
          onPlaybackChange={onPlaybackChange}
          onViewVideo={onViewVideo}
          videoId={video.id}
        />
      ) : (
        <TouchableOpacity
          style={styles.loading}
          onPress={onRequestPlayback}
          accessibilityRole="button"
          accessibilityLabel={`Зареди ${video.title}`}
        >
          <ActivityIndicator size="large" color="#ffffff" />
        </TouchableOpacity>
      )}
      <VideoCaption
        title={video.title}
        description={video.description ?? null}
        visible={captionVisible}
        height="22%"
        maxHeight={height * 0.22}
        bottomOffset={32}
        allowExpand
        fitContent
      />
    </View>
  );
}

function PlayableVideo({
  url,
  thumbnailUrl,
  active,
  onPlaybackChange,
  onViewVideo,
  videoId,
}: {
  url: string;
  thumbnailUrl: string | null;
  active: boolean;
  onPlaybackChange?: (isPlaying: boolean) => void;
  onViewVideo?: (videoId: number) => void;
  videoId: number;
}) {
  return (
    <ControlledVideoPlayer
      url={url}
      thumbnailUrl={thumbnailUrl}
      active={active}
      contentFit="cover"
      showControls={false}
      onPlaybackChange={onPlaybackChange}
      onViewVideo={() => onViewVideo?.(videoId)}
      videoId={videoId}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  slide: { backgroundColor: "#000", justifyContent: "center" },
  loading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    top: 52,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});
