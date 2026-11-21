import type { VideoItem } from "@/types/video";
import VideoCaption from "@/components/video/video-caption";
import ControlledVideoPlayer from "@/components/video/controlled-video-player";
import { getVideoDisplayTitle, shouldHideVideoSocialActions } from "@/constants/featured-video";
import TikTokVideoGestureSurface from "@/components/video/tiktok-video-gesture-surface";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import VideoCommentsSheet from "@/components/video/video-comments-sheet";
import { useRouter } from "expo-router";

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
  onActiveIndexChange?: (index: number) => void;
  onRequestExitFullscreen?: () => void;
  onViewVideo?: (videoId: number) => void;
  onClose: () => void;
  colors: PagerColors;
  token?: string | null;
  onCommentCountChange?: (videoId: number, count: number) => void;
  savedVideoIds?: ReadonlySet<number>;
  savingVideoIds?: ReadonlySet<number>;
  onToggleSaved?: (videoId: number) => void;
  onRequireAuthentication?: () => void;
};

export default function ProfileVideoPager({
  visible,
  videos,
  initialIndex,
  playbackUrls,
  onRequestPlayback,
  onActiveIndexChange,
  onRequestExitFullscreen,
  onViewVideo,
  onClose,
  colors,
  token,
  onCommentCountChange,
  savedVideoIds,
  savingVideoIds,
  onToggleSaved,
  onRequireAuthentication,
}: Props) {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const listRef = useRef<FlatList<VideoItem>>(null);
  const activeIndexRef = useRef(Math.max(0, initialIndex));
  const [activeIndex, setActiveIndex] = useState(Math.max(0, initialIndex));
  const [isZooming, setIsZooming] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isCaptionScrolling, setIsCaptionScrolling] = useState(false);
  const [commentsVideoId, setCommentsVideoId] = useState<number | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!visible) {
      setIsZooming(false);
      setIsScrubbing(false);
      setIsCaptionScrolling(false);
      setCommentsVideoId(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || initialIndex < 0 || initialIndex === activeIndexRef.current) return;
    activeIndexRef.current = initialIndex;
    setActiveIndex(initialIndex);
    listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
  }, [initialIndex, visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.screen}>
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
          <FlatList
          ref={listRef}
          data={videos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <TikTokVideoGestureSurface
              active={index === activeIndex}
              width={width}
              height={height}
              onZoomChange={index === activeIndex ? setIsZooming : undefined}
              onRequestExitFullscreen={index === activeIndex ? onRequestExitFullscreen : undefined}
            >
              <ProfileVideoSlide
                video={item}
                url={playbackUrls[item.id] ?? null}
                width={width}
                height={height}
                captionVisible={index === activeIndex}
                onRequestPlayback={() => onRequestPlayback(index)}
                active={index === activeIndex}
                onScrubbingChange={index === activeIndex ? setIsScrubbing : undefined}
                onCaptionScrollChange={index === activeIndex ? setIsCaptionScrolling : undefined}
                onViewVideo={onViewVideo}
                commentsCount={commentCounts[item.id] ?? item.comments_count ?? 0}
                onOpenComments={token
                  ? () => setCommentsVideoId(item.id)
                  : onRequireAuthentication}
                saved={savedVideoIds?.has(item.id) ?? false}
                saving={savingVideoIds?.has(item.id) ?? false}
                onToggleSaved={onToggleSaved ? () => onToggleSaved(item.id) : undefined}
              />
            </TikTokVideoGestureSurface>
          )}
          getItemLayout={(_, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
          initialScrollIndex={Math.max(0, initialIndex)}
          pagingEnabled
          snapToInterval={height}
          snapToAlignment="start"
          disableIntervalMomentum
          scrollEnabled={!isZooming && !isScrubbing && !isCaptionScrolling}
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
            if (index === activeIndexRef.current) return;
            activeIndexRef.current = index;
            setActiveIndex(index);
            onActiveIndexChange?.(index);
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
          {token ? (
            <VideoCommentsSheet
              visible={commentsVideoId !== null}
              token={token}
              videoId={commentsVideoId}
              initialCount={commentsVideoId ? commentCounts[commentsVideoId]
                ?? videos.find((video) => video.id === commentsVideoId)?.comments_count
                ?? 0 : 0}
              onClose={() => setCommentsVideoId(null)}
              onCountChange={(nextCount) => {
                if (!commentsVideoId) return;
                setCommentCounts((current) => ({ ...current, [commentsVideoId]: nextCount }));
                onCommentCountChange?.(commentsVideoId, nextCount);
              }}
              onOpenProfile={(userId) => {
                setCommentsVideoId(null);
                onClose();
                router.push({ pathname: "/user/[id]", params: { id: String(userId) } });
              }}
            />
          ) : null}
        </View>
      </GestureHandlerRootView>
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
  onScrubbingChange,
  onCaptionScrollChange,
  onViewVideo,
  commentsCount,
  onOpenComments,
  saved,
  saving,
  onToggleSaved,
}: {
  video: VideoItem;
  url: string | null;
  width: number;
  height: number;
  captionVisible: boolean;
  onPlaybackChange?: (isPlaying: boolean) => void;
  onRequestPlayback: () => void;
  active: boolean;
  onScrubbingChange?: (isScrubbing: boolean) => void;
  onCaptionScrollChange?: (isScrolling: boolean) => void;
  onViewVideo?: (videoId: number) => void;
  commentsCount: number;
  onOpenComments?: () => void;
  saved: boolean;
  saving: boolean;
  onToggleSaved?: () => void;
}) {
  const [captionInteractionKey, setCaptionInteractionKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <View style={[styles.slide, { width, height }]}>
      {url ? (
        <PlayableVideo
          url={url}
          thumbnailUrl={video.thumbnail_url}
          active={active}
          onVideoPress={() => setCaptionInteractionKey((key) => key + 1)}
          onPlaybackChange={(nextIsPlaying) => {
            setIsPlaying(nextIsPlaying);
            onPlaybackChange?.(nextIsPlaying);
          }}
          onScrubbingChange={onScrubbingChange}
          onViewVideo={onViewVideo}
          videoId={video.id}
        />
      ) : (
        <TouchableOpacity
          style={styles.loading}
          onPress={onRequestPlayback}
          accessibilityRole="button"
          accessibilityLabel={getVideoDisplayTitle(video)
            ? `Зареди ${getVideoDisplayTitle(video)}`
            : "Зареди видеото"}
        >
          <ActivityIndicator size="large" color="#ffffff" />
        </TouchableOpacity>
      )}
      <VideoCaption
        title={getVideoDisplayTitle(video)}
        description={video.description ?? null}
        visible={captionVisible}
        height="22%"
        maxHeight={height * 0.22}
        bottomOffset={32}
        allowExpand
        fitContent
        interactionKey={captionInteractionKey}
        isPlaying={isPlaying}
        onDescriptionScrollChange={onCaptionScrollChange}
      />
      {onOpenComments && !shouldHideVideoSocialActions(video.id) ? (
        <TouchableOpacity
          style={styles.commentButton}
          onPress={onOpenComments}
          accessibilityRole="button"
          accessibilityLabel={`Коментари: ${commentsCount}`}
        >
          <Feather name="message-circle" size={30} color="#ffffff" />
          <Text style={styles.commentLabel}>Коментари</Text>
        </TouchableOpacity>
      ) : null}
      {onToggleSaved && !shouldHideVideoSocialActions(video.id) ? (
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.actionButtonDisabled]}
          onPress={onToggleSaved}
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

function PlayableVideo({
  url,
  thumbnailUrl,
  active,
  onVideoPress,
  onPlaybackChange,
  onScrubbingChange,
  onViewVideo,
  videoId,
}: {
  url: string;
  thumbnailUrl: string | null;
  active: boolean;
  onVideoPress?: () => void;
  onPlaybackChange?: (isPlaying: boolean) => void;
  onScrubbingChange?: (isScrubbing: boolean) => void;
  onViewVideo?: (videoId: number) => void;
  videoId: number;
}) {
  return (
    <ControlledVideoPlayer
      url={url}
      thumbnailUrl={thumbnailUrl}
      active={active}
      loop
      contentFit="cover"
      showControls={false}
      onVideoPress={onVideoPress}
      onPlaybackChange={onPlaybackChange}
      onScrubbingChange={onScrubbingChange}
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
  commentButton: {
    position: "absolute",
    right: 7,
    bottom: 126,
    zIndex: 24,
    width: 72,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    position: "absolute",
    right: 7,
    bottom: 60,
    zIndex: 24,
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
