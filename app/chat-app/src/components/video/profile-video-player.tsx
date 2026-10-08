import ControlledVideoPlayer from "@/components/video/controlled-video-player";
import VideoCaption from "@/components/video/video-caption";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Modal, StyleSheet, View } from "react-native";
import { useMemo, useState } from "react";

type PlayerColors = { background: string; text: string; textSecondary: string };

export default function ProfileVideoPlayer({
  visible,
  title,
  description,
  url,
  onClose,
  canGoPrevious,
  canGoNext,
  onSwipeDown,
  onSwipeUp,
  colors,
}: {
  visible: boolean;
  title: string;
  description: string | null;
  url: string | null;
  onClose: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  colors: PlayerColors;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {url ? (
        <PlayerSurface
          title={title}
          description={description}
          url={url}
          colors={colors}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onSwipeDown={onSwipeDown}
          onSwipeUp={onSwipeUp}
        />
      ) : null}
    </Modal>
  );
}

function PlayerSurface({
  title,
  description,
  url,
  colors,
  canGoPrevious = false,
  canGoNext = false,
  onSwipeDown,
  onSwipeUp,
}: {
  title: string;
  description: string | null;
  url: string;
  colors: PlayerColors;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [captionInteractionKey, setCaptionInteractionKey] = useState(0);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(20)
        .activeOffsetY([-20, 20])
        .failOffsetX([-80, 80])
        .onEnd((event) => {
          const isVerticalSwipe =
            Math.abs(event.translationY) > 55 &&
            Math.abs(event.translationY) > Math.abs(event.translationX) * 1.2;

          if (!isVerticalSwipe) return;
          if (event.translationY < 0 && canGoNext) onSwipeUp?.();
          if (event.translationY > 0 && canGoPrevious) onSwipeDown?.();
        }),
    [canGoNext, canGoPrevious, onSwipeDown, onSwipeUp],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ControlledVideoPlayer
        url={url}
        active
        contentFit="cover"
        showControls={false}
        onVideoPress={() => setCaptionInteractionKey((key) => key + 1)}
        onPlaybackChange={setIsPlaying}
        style={styles.player}
      />
      <GestureDetector gesture={swipeGesture}>
        <View
          style={styles.swipeCaptureLayer}
          accessible
          accessibilityLabel="Плъзнете нагоре или надолу за друго видео"
        />
      </GestureDetector>
      <VideoCaption
        title={title}
        description={description}
        visible
        bottomOffset={32}
        interactionKey={captionInteractionKey}
        isPlaying={isPlaying}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 0 },
  player: { width: "100%", flex: 1, backgroundColor: "#000" },
  swipeCaptureLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 96,
    backgroundColor: "transparent",
  },
});
