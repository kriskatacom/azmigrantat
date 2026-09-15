import type { VideoItem } from "@/types/video";
import VideoCaption from "@/components/video/video-caption";
import { useVideoPlayer, VideoView } from "expo-video";
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

type Props = {
  visible: boolean;
  videos: VideoItem[];
  initialIndex: number;
  playbackUrls: Record<number, string>;
  onRequestPlayback: (index: number) => void;
  onClose: () => void;
  colors: PagerColors;
};

export default function ProfileVideoPager({
  visible,
  videos,
  initialIndex,
  playbackUrls,
  onRequestPlayback,
  onClose,
  colors,
}: Props) {
  const { height, width } = useWindowDimensions();
  const listRef = useRef<FlatList<VideoItem>>(null);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isCaptionVisible, setIsCaptionVisible] = useState(false);

  useEffect(() => {
    return () => {
      if (captionTimer.current) clearTimeout(captionTimer.current);
    };
  }, []);

  const toggleCaption = () => {
    const nextVisible = !isCaptionVisible;
    setIsCaptionVisible(nextVisible);
    if (captionTimer.current) clearTimeout(captionTimer.current);
    captionTimer.current = nextVisible
      ? setTimeout(() => {
          setIsCaptionVisible(false);
          captionTimer.current = null;
        }, 3_000)
      : null;
  };

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
              captionVisible={isCaptionVisible}
              onToggleCaption={toggleCaption}
              onRequestPlayback={() => onRequestPlayback(index)}
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
          onMomentumScrollEnd={(event) => {
            const index = Math.max(
              0,
              Math.min(
                videos.length - 1,
                Math.round(event.nativeEvent.contentOffset.y / height),
              ),
            );
            setIsCaptionVisible(false);
            onRequestPlayback(index);
          }}
        />
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Затвори видеото"
        >
          <FontAwesome name="close" size={22} color="#ffffff" />
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
  onToggleCaption,
  onRequestPlayback,
}: {
  video: VideoItem;
  url: string | null;
  width: number;
  height: number;
  captionVisible: boolean;
  onToggleCaption: () => void;
  onRequestPlayback: () => void;
}) {
  return (
    <View style={[styles.slide, { width, height }]}>
      {url ? (
        <PlayableVideo url={url} />
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
      <TouchableOpacity
        style={styles.touchLayer}
        activeOpacity={1}
        onPress={onToggleCaption}
        accessibilityRole="button"
        accessibilityLabel="Покажи заглавието и описанието"
      />
      <VideoCaption
        title={video.title}
        description={video.description ?? null}
        visible={captionVisible}
        height="22%"
        allowExpand
        fitContent
      />
    </View>
  );
}

function PlayableVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    instance.muted = false;
    instance.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  slide: { backgroundColor: "#000", justifyContent: "center" },
  touchLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "transparent",
  },
  video: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#000",
  },
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
});
