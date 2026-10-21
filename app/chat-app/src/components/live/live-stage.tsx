import LiveReactionBurst from "@/components/live/live-reaction-burst";
import LiveViewerCount from "@/components/live/live-viewer-count";
import RemoteImage from "@/components/ui/RemoteImage";
import type { LiveReactionEvent } from "@/hooks/live/useLiveRoom";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RTCView, type MediaStream } from "react-native-webrtc";

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
  hostMenuVisible?: boolean;
  onDismissHostMenu?: () => void;
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
  label,
  coverUri,
  onOpenComments,
  onOpenTalkers,
  onToggleMicrophone,
  onToggleCamera,
  onSwitchCamera,
  hostMenuVisible = false,
  onDismissHostMenu,
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
  const primaryStream = remoteStream ?? localStream;
  const primaryVideoTrack = primaryStream?.getVideoTracks()[0];
  const primaryVideoVisible = Boolean(
    primaryStream &&
      primaryVideoTrack?.enabled !== false &&
      (remoteStream ? remoteCameraEnabled : showLocalVideo),
  );
  const showLocalPreview = Boolean(remoteStream && localStream && showLocalVideo);
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
          {primaryVideoVisible && primaryStream ? (
            <RTCView
              streamURL={primaryStream.toURL()}
              style={StyleSheet.absoluteFill}
              objectFit="cover"
              mirror={!remoteStream && cameraFacing === "user"}
              zOrder={0}
            />
          ) : (
            <View style={styles.cameraOffState}>
              <Ionicons name="videocam-off-outline" size={42} color="#e2e8f0" />
              <Text style={styles.cameraOffText}>Камерата е изключена</Text>
            </View>
          )}
          {showLocalPreview && localStream ? (
            <View style={styles.localPreview}>
              <RTCView
                streamURL={localStream.toURL()}
                style={StyleSheet.absoluteFill}
                objectFit="cover"
                mirror={cameraFacing === "user"}
                zOrder={1}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable
        style={styles.controlsRevealArea}
        onPress={() => {
          onDismissHostMenu?.();
          showControls();
        }}
        accessibilityRole="button"
        accessibilityLabel="Покажи контролите"
      />

      <Animated.View
        pointerEvents={controlsVisible ? "auto" : "none"}
        style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
      >
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
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <LiveViewerCount count={viewerCount} variant="overlay" />
          </View>
          <View style={styles.topRight}>
            {topRight}
          </View>
        </View>
      </Animated.View>

      {connected && localStream && hostMenuVisible ? (
        <View style={styles.hostMenu}>
          <LiveControlRow
            icon={microphoneEnabled ? "mic-outline" : "mic-off-outline"}
            label="Микрофон"
            active={microphoneEnabled}
            onPress={onToggleMicrophone}
          />
          <LiveControlRow
            icon={cameraEnabled ? "videocam-outline" : "videocam-off-outline"}
            label="Камера"
            active={cameraEnabled}
            onPress={onToggleCamera}
          />
          <LiveControlRow
            icon="camera-reverse-outline"
            label="Обръщане на камера"
            active={cameraEnabled}
            onPress={cameraEnabled ? onSwitchCamera : undefined}
          />
          <LiveControlRow
            icon="people-outline"
            label="Участници"
            onPress={onOpenTalkers}
          />
          <LiveControlRow
            icon="chatbubbles-outline"
            label="Коментари"
            onPress={onOpenComments}
            last
          />
        </View>
      ) : null}

      {children}

      <LiveReactionBurst
        reactions={reactions}
        showChips
        chipBottom="34%"
        liftDistance={500}
      />
    </View>
  );
}

function LiveControlRow({
  icon,
  label,
  active = true,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.hostMenuRow, !last && styles.hostMenuRowBorder]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={active ? "#ffffff" : "#fca5a5"} />
      <Text style={styles.hostMenuLabel}>{label}</Text>
    </TouchableOpacity>
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
  liveBadge: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(20, 24, 31, 0.72)",
  },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#f43f5e" },
  liveBadgeText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
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
  hostMenu: {
    position: "absolute",
    right: 18,
    bottom: 144,
    width: 176,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(28, 29, 32, 0.9)",
    zIndex: 5,
  },
  hostMenuRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hostMenuRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.2)" },
  hostMenuLabel: { flex: 1, color: "#ffffff", fontSize: 13, fontWeight: "500" },
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
  cameraOffState: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#111827",
  },
  cameraOffText: { color: "#e2e8f0", fontSize: 14, fontWeight: "700" },
  localPreview: {
    position: "absolute",
    top: 74,
    right: 14,
    width: 92,
    height: 132,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.65)",
    backgroundColor: "#111827",
  },
});
