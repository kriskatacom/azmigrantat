import LiveReactionBurst from "@/components/live/live-reaction-burst";
import LiveReactions from "@/components/live/live-reactions";
import LiveViewerCount from "@/components/live/live-viewer-count";
import RemoteImage from "@/components/ui/RemoteImage";
import type { LiveReactionEvent } from "@/hooks/live/useLiveRoom";
import type { LiveReactionType } from "@/types/live";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { MediaStream } from "react-native-webrtc";
import VideoCallView from "@/components/video/video-call-view";

type LiveStageProps = {
  connected: boolean;
  error?: string | null;
  viewerCount: number;
  reactions: LiveReactionEvent[];
  bottomInset?: number;
  label: string;
  coverUri?: string | null;
  onOpenComments?: () => void;
  onOpenTalkers?: () => void;
  onOpenMoreReactions?: () => void;
  onToggleMicrophone?: () => void;
  onToggleCamera?: () => void;
  onSwitchCamera?: () => void;
  onReact: (type: LiveReactionType) => void;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  children?: ReactNode;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  showLocalVideo?: boolean;
  microphoneEnabled?: boolean;
  cameraEnabled?: boolean;
  cameraFacing?: "user" | "environment";
  remoteCameraEnabled?: boolean;
};

export default function LiveStage({
  connected,
  error = null,
  viewerCount,
  reactions,
  bottomInset = 16,
  label,
  coverUri,
  onOpenComments,
  onOpenTalkers,
  onOpenMoreReactions,
  onToggleMicrophone,
  onToggleCamera,
  onSwitchCamera,
  onReact,
  topLeft,
  topRight,
  children,
  localStream = null,
  remoteStream = null,
  showLocalVideo = true,
  microphoneEnabled = true,
  cameraEnabled = showLocalVideo,
  cameraFacing = "user",
  remoteCameraEnabled = true,
}: LiveStageProps) {
  const hasMediaStream = Boolean(localStream || remoteStream);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideControlsTimer = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  }, []);

  const showControls = useCallback(() => {
    clearHideControlsTimer();
    setControlsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    hideControlsTimer.current = setTimeout(() => {
      setControlsVisible(false);
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }).start();
      hideControlsTimer.current = null;
    }, 3000);
  }, [clearHideControlsTimer, controlsOpacity]);

  useEffect(() => {
    if (connected) {
      showControls();
    }

    return clearHideControlsTimer;
  }, [clearHideControlsTimer, connected, showControls]);

  return (
    <View
      style={styles.stageFullscreen}
    >
      {coverUri && !hasMediaStream ? (
        <>
          <RemoteImage uri={coverUri} style={styles.cover} />
          <View pointerEvents="none" style={styles.coverDim} />
        </>
      ) : null}

      {hasMediaStream ? (
        <View style={styles.mediaSurface}>
          <VideoCallView
            localStream={localStream}
            remoteStream={remoteStream}
            isCameraEnabled={showLocalVideo}
            localMirror={cameraFacing === "user"}
            isRemoteCameraEnabled={remoteCameraEnabled}
            displayName={label}
          />
        </View>
      ) : null}

      <Pressable
        style={styles.controlsRevealArea}
        onPress={showControls}
        accessibilityRole="button"
        accessibilityLabel="Покажи контролите"
      />

      <Animated.View
        pointerEvents={controlsVisible ? "auto" : "none"}
        style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
      >
        {connected && (localStream || onOpenComments) ? (
          <View style={styles.captureStatusFullscreen}>
          {topRight ? (
            <View style={styles.captureStatusEnd}>{topRight}</View>
          ) : null}
          {onOpenComments ? (
            <TouchableOpacity
              onPress={onOpenComments}
              style={[styles.captureStatusItem, styles.captureStatusItemFullscreen]}
              accessibilityRole="button"
              accessibilityLabel="Отвори всички коментари"
            >
              <Ionicons name="chatbubbles-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : null}
          {onOpenTalkers ? (
            <TouchableOpacity
              onPress={onOpenTalkers}
              style={[styles.captureStatusItem, styles.captureStatusItemFullscreen]}
              accessibilityRole="button"
              accessibilityLabel="Покажи активните разговори"
            >
              <Ionicons name="people-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : null}
          {localStream ? (
            <>
          <TouchableOpacity
            style={[styles.captureStatusItem, styles.captureStatusItemFullscreen]}
            onPress={onSwitchCamera}
            disabled={!onSwitchCamera || !cameraEnabled}
            accessibilityRole="button"
            accessibilityLabel="Превключи камерата"
          >
            <Ionicons name="camera-reverse-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.captureStatusItem,
              styles.captureStatusItemFullscreen,
              !cameraEnabled && styles.captureStatusItemOff,
            ]}
            onPress={onToggleCamera}
            disabled={!onToggleCamera}
            accessibilityRole="button"
            accessibilityLabel={cameraEnabled ? "Изключи камерата" : "Включи камерата"}
          >
            <Ionicons
              name={cameraEnabled ? "videocam" : "videocam-off"}
              size={20}
              color={cameraEnabled ? "#bbf7d0" : "#fecaca"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.captureStatusItem,
              styles.captureStatusItemFullscreen,
              !microphoneEnabled && styles.captureStatusItemOff,
            ]}
            onPress={onToggleMicrophone}
            disabled={!onToggleMicrophone}
            accessibilityRole="button"
            accessibilityLabel={microphoneEnabled ? "Изключи микрофона" : "Включи микрофона"}
          >
            <Ionicons
              name={microphoneEnabled ? "mic" : "mic-off"}
              size={20}
              color={microphoneEnabled ? "#bbf7d0" : "#fecaca"}
            />
          </TouchableOpacity>
            </>
          ) : null}
          </View>
        ) : null}

      {!connected && !error ? (
        <View pointerEvents="none" style={styles.connecting}>
          <Text style={styles.connectingText}>Свързване...</Text>
        </View>
      ) : null}

      {!connected && error ? (
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Live връзката не успя</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!hasMediaStream && connected ? <Text style={styles.label}>{label}</Text> : null}

        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            {topLeft}
          </View>
          <View style={styles.topRight}>
            <LiveViewerCount count={viewerCount} variant="overlay" />
          </View>
        </View>

        <View
          style={[
            styles.reactionRail,
            { top: 104, bottom: bottomInset },
          ]}
        >
          <LiveReactions vertical limit={5} onMore={onOpenMoreReactions} onReact={onReact} />
        </View>

        {children}
      </Animated.View>

      <LiveReactionBurst
        reactions={reactions}
        showChips
        chipBottom="34%"
        liftDistance={500}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stageFullscreen: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    height: undefined,
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
  },
  label: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 48,
    zIndex: 2,
  },
  topBar: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 3,
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlsRevealArea: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  captureStatusEnd: { marginTop: 0 },
  reactionRail: {
    position: "absolute",
    right: 10,
    width: 48,
    zIndex: 4,
  },
  captureStatusFullscreen: {
    top: 56,
    bottom: undefined,
    left: 12,
    flexDirection: "column",
    alignItems: "flex-start",
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 8,
    backgroundColor: "transparent",
  },
  captureStatusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  captureStatusItemFullscreen: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    backgroundColor: "rgba(8, 12, 24, 0.72)",
  },
  captureStatusItemOff: {
    opacity: 0.96,
  },
  connecting: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(3, 7, 18, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  connectingText: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  errorState: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "rgba(3, 7, 18, 0.9)",
    zIndex: 5,
  },
  errorTitle: {
    color: "#fecaca",
    fontWeight: "800",
    textAlign: "center",
  },
  errorText: {
    color: "#e2e8f0",
    marginTop: 8,
    textAlign: "center",
  },
  cover: {
    ...StyleSheet.absoluteFill,
  },
  coverDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(3, 7, 18, 0.38)",
  },
  mediaSurface: {
    ...StyleSheet.absoluteFill,
  },
});
