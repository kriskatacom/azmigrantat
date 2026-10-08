import { useEventListener } from "expo";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

const SEEK_STEP_SECONDS = 10;
const DOUBLE_TAP_DELAY_MS = 260;
const SEEK_SEQUENCE_RESET_MS = 900;
const PLAYBACK_INDICATOR_HIDE_MS = 3000;

type Props = {
  url: string;
  thumbnailUrl?: string | null;
  active: boolean;
  muted?: boolean;
  loop?: boolean;
  contentFit?: "cover" | "contain" | "fill";
  controlsBottomOffset?: number;
  showControls?: boolean;
  style?: StyleProp<ViewStyle>;
  onVideoPress?: () => void;
  onPlaybackChange?: (isPlaying: boolean) => void;
  onViewVideo?: () => void;
  videoId?: number;
};

export default function ControlledVideoPlayer(props: Props) {
  const [isScreenFocused, setIsScreenFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, []),
  );

  if (!isScreenFocused) {
    return <View style={[styles.container, props.style]} />;
  }

  return <FocusedControlledVideoPlayer {...props} />;
}

function FocusedControlledVideoPlayer({
  url,
  thumbnailUrl,
  active,
  muted = false,
  loop = false,
  contentFit = "contain",
  controlsBottomOffset = 0,
  showControls = true,
  style,
  onVideoPress,
  onPlaybackChange,
  onViewVideo,
  videoId,
}: Props) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = loop;
    instance.muted = muted;
    instance.timeUpdateEventInterval = 0.25;
    if (active) instance.play();
  });
  const [isReady, setIsReady] = useState(player.status === "readyToPlay");
  const [isPlaying, setIsPlaying] = useState(player.playing);
  const [currentTime, setCurrentTime] = useState(player.currentTime);
  const [duration, setDuration] = useState(player.duration);
  const [progressWidth, setProgressWidth] = useState(0);
  const [isPlaybackIndicatorVisible, setIsPlaybackIndicatorVisible] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<{
    direction: "backward" | "forward";
    seconds: number;
  } | null>(null);
  const viewCountedRef = useRef(false);
  const videoWidthRef = useRef(0);
  const pendingTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeekDirectionRef = useRef<"backward" | "forward" | null>(null);
  const accumulatedSeekRef = useRef(0);

  useEventListener(player, "statusChange", ({ status, error }) => {
    setIsReady(status === "readyToPlay");
    if (status === "readyToPlay") setDuration(player.duration);
    if (status === "error") {
      console.error("[ControlledVideoPlayer] Видеото не може да бъде възпроизведено.", {
        videoId,
        url,
        error,
      });
    }
  });

  useEventListener(player, "playingChange", ({ isPlaying: nextIsPlaying }) => {
    setIsPlaying(nextIsPlaying);
    onPlaybackChange?.(nextIsPlaying);
  });

  useEventListener(player, "timeUpdate", ({ currentTime: nextCurrentTime }) => {
    setCurrentTime(nextCurrentTime);
    if (player.duration > 0) setDuration(player.duration);
  });

  useEffect(() => {
    if (playbackIndicatorTimerRef.current) {
      clearTimeout(playbackIndicatorTimerRef.current);
      playbackIndicatorTimerRef.current = null;
    }

    if (!isPlaying) {
      setIsPlaybackIndicatorVisible(true);
      return;
    }

    playbackIndicatorTimerRef.current = setTimeout(() => {
      setIsPlaybackIndicatorVisible(false);
      playbackIndicatorTimerRef.current = null;
    }, PLAYBACK_INDICATOR_HIDE_MS);

    return () => {
      if (playbackIndicatorTimerRef.current) {
        clearTimeout(playbackIndicatorTimerRef.current);
        playbackIndicatorTimerRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!active) {
      player.pause();
      viewCountedRef.current = false;
      return;
    }

    if (isReady && !player.playing) player.play();
    if (isReady && !viewCountedRef.current) {
      viewCountedRef.current = true;
      onViewVideo?.();
    }
  }, [active, isReady, onViewVideo, player]);

  const togglePlayback = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const handleVideoTap = useCallback((locationX: number) => {
    const direction: "backward" | "forward" =
      locationX < videoWidthRef.current / 2 ? "backward" : "forward";

    if (pendingTapTimerRef.current) {
      clearTimeout(pendingTapTimerRef.current);
      pendingTapTimerRef.current = null;

      const nextSeek = lastSeekDirectionRef.current === direction
        ? accumulatedSeekRef.current + 5
        : 5;
      accumulatedSeekRef.current = nextSeek;
      lastSeekDirectionRef.current = direction;
      player.seekBy(direction === "backward" ? -nextSeek : nextSeek);
      setSeekFeedback({ direction, seconds: nextSeek });
      if (seekFeedbackTimerRef.current) clearTimeout(seekFeedbackTimerRef.current);
      seekFeedbackTimerRef.current = setTimeout(() => {
        setSeekFeedback(null);
        seekFeedbackTimerRef.current = null;
      }, SEEK_SEQUENCE_RESET_MS);

      if (seekResetTimerRef.current) clearTimeout(seekResetTimerRef.current);
      seekResetTimerRef.current = setTimeout(() => {
        lastSeekDirectionRef.current = null;
        accumulatedSeekRef.current = 0;
        seekResetTimerRef.current = null;
      }, SEEK_SEQUENCE_RESET_MS);
      return;
    }

    pendingTapTimerRef.current = setTimeout(() => {
      pendingTapTimerRef.current = null;
      togglePlayback();
      setIsPlaybackIndicatorVisible((visible) => !visible);
      onVideoPress?.();
    }, DOUBLE_TAP_DELAY_MS);
  }, [onVideoPress, player, togglePlayback]);

  useEffect(() => {
    return () => {
      if (pendingTapTimerRef.current) clearTimeout(pendingTapTimerRef.current);
      if (seekResetTimerRef.current) clearTimeout(seekResetTimerRef.current);
      if (seekFeedbackTimerRef.current) clearTimeout(seekFeedbackTimerRef.current);
      if (playbackIndicatorTimerRef.current) clearTimeout(playbackIndicatorTimerRef.current);
    };
  }, []);

  const seek = (seconds: number) => {
    player.seekBy(seconds);
  };

  const seekToProgress = (locationX: number) => {
    if (duration <= 0 || progressWidth <= 0) return;
    const targetTime = Math.min(duration, Math.max(0, (locationX / progressWidth) * duration));
    player.seekBy(targetTime - player.currentTime);
  };

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={[styles.video, { bottom: insets.bottom }]}
        contentFit={contentFit}
        nativeControls={false}
        surfaceType="textureView"
      />
      {thumbnailUrl && !isReady ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={[styles.thumbnail, { bottom: insets.bottom }]}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          pointerEvents="none"
        />
      ) : null}
      <Pressable
        style={[styles.touchLayer, { bottom: insets.bottom }]}
        onLayout={(event) => {
          videoWidthRef.current = event.nativeEvent.layout.width;
        }}
        onPress={(event) => handleVideoTap(event.nativeEvent.locationX)}
        accessibilityRole="button"
        accessibilityLabel="Пусни или спри видеото. Двойно натискане отляво или отдясно превърта видеото."
      />
      {isPlaybackIndicatorVisible ? (
        <View style={styles.playbackIndicatorLayer} pointerEvents="none">
          <View style={styles.playbackIndicator}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={34} color="#ffffff" />
          </View>
        </View>
      ) : null}
      {seekFeedback ? (
        <View
          style={[
            styles.seekFeedback,
            seekFeedback.direction === "backward" ? styles.seekFeedbackLeft : styles.seekFeedbackRight,
          ]}
          pointerEvents="none"
        >
          <Ionicons
            name={seekFeedback.direction === "backward" ? "play-back" : "play-forward"}
            size={24}
            color="#ffffff"
          />
          <Text style={styles.seekFeedbackText}>
            {seekFeedback.direction === "backward" ? "-" : "+"}{seekFeedback.seconds} сек
          </Text>
        </View>
      ) : null}
      {showControls ? (
        <View
          style={[styles.controls, { bottom: Math.max(insets.bottom, controlsBottomOffset) }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.progressTrack}
            onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)}
            onPress={(event) => seekToProgress(event.nativeEvent.locationX)}
            accessibilityRole="adjustable"
            accessibilityLabel="Позиция във видеото"
            accessibilityValue={{ min: 0, max: duration, now: currentTime }}
          >
            <View style={[styles.progressValue, { width: `${progress * 100}%` }]} />
          </Pressable>
          <View style={styles.controlRow}>
            <Pressable
              style={styles.controlButton}
              onPress={() => seek(-SEEK_STEP_SECONDS)}
              accessibilityRole="button"
              accessibilityLabel="Върни 10 секунди назад"
            >
              <Ionicons name="play-back" size={22} color="#ffffff" />
              <Text style={styles.seekLabel}>10</Text>
            </Pressable>
            <Pressable
              style={styles.playButton}
              onPress={togglePlayback}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? "Пауза на видеото" : "Пусни видеото"}
            >
              <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#101827" />
            </Pressable>
            <Pressable
              style={styles.controlButton}
              onPress={() => seek(SEEK_STEP_SECONDS)}
              accessibilityRole="button"
              accessibilityLabel="Превърти 10 секунди напред"
            >
              <Ionicons name="play-forward" size={22} color="#ffffff" />
              <Text style={styles.seekLabel}>10</Text>
            </Pressable>
            <Text style={styles.timeLabel}>{formatTime(currentTime)} / {formatTime(duration)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
  video: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
  thumbnail: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
  touchLayer: { ...StyleSheet.absoluteFill, backgroundColor: "transparent" },
  playbackIndicatorLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  playbackIndicator: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  seekFeedback: {
    position: "absolute",
    top: "45%",
    minWidth: 112,
    height: 64,
    paddingHorizontal: 14,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  seekFeedbackLeft: { left: 28 },
  seekFeedbackRight: { right: 28 },
  seekFeedbackText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  controls: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  progressValue: { height: "100%", backgroundColor: "#E8E296" },
  controlRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  controlButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8E296",
  },
  seekLabel: {
    position: "absolute",
    right: 5,
    bottom: 3,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
  timeLabel: {
    flex: 1,
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
});
