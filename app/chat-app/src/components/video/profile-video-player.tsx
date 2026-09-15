import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Animated, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const overlayVisible = useRef(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    instance.muted = false;
    instance.play();
  });

  const toggleOverlay = useCallback(() => {
    overlayVisible.current = !overlayVisible.current;
    setIsOverlayVisible(overlayVisible.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    overlayOpacity.stopAnimation();
    Animated.timing(overlayOpacity, {
      toValue: overlayVisible.current ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    if (overlayVisible.current) {
      hideTimer.current = setTimeout(() => {
        overlayVisible.current = false;
        setIsOverlayVisible(false);
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
        hideTimer.current = null;
      }, 3_000);
    } else {
      hideTimer.current = null;
    }
  }, [overlayOpacity]);

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

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .maxDistance(12)
        .onEnd(() => {
          toggleOverlay();
        }),
    [toggleOverlay],
  );

  const playerGesture = useMemo(
    () => Gesture.Exclusive(swipeGesture, tapGesture),
    [swipeGesture, tapGesture],
  );

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEventListener(player, "statusChange", ({ status, error }) => {
    if (status === "error") {
      console.error("[VideoPlayback] Bunny HLS потокът не може да бъде възпроизведен.", {
        error,
        url,
      });
    }
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <VideoView
        player={player}
        style={styles.player}
        nativeControls
        contentFit="contain"
        onTouchEnd={toggleOverlay}
        accessibilityLabel="Покажи информацията за видеото"
      />
      <GestureDetector gesture={playerGesture}>
        <View
          style={styles.swipeCaptureLayer}
          accessible
          accessibilityLabel="Плъзнете нагоре или надолу за друго видео"
        />
      </GestureDetector>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents={isOverlayVisible ? "auto" : "none"}>
        <ScrollView
          style={styles.overlayScroll}
          onTouchEnd={toggleOverlay}
          persistentScrollbar
          showsVerticalScrollIndicator
          contentContainerStyle={styles.overlayContent}
        >
          <Text selectable style={styles.title}>{title}</Text>
          {description ? (
            <Text selectable style={styles.description}>{description}</Text>
          ) : null}
        </ScrollView>
      </Animated.View>
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
  overlay: {
    position: "absolute",
    right: 0,
    bottom: 56,
    width: "100%",
    maxHeight: "40%",
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    borderRadius: 0,
    overflow: "hidden",
  },
  overlayScroll: { flexGrow: 0 },
  overlayContent: { padding: 14, gap: 8 },
  title: { color: "#ffffff", fontSize: 17, lineHeight: 22, fontWeight: "800" },
  description: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20 },
});
