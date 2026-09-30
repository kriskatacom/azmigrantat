import LiveReactionBurst from "@/components/live/live-reaction-burst";
import LiveReactions from "@/components/live/live-reactions";
import LiveViewerCount from "@/components/live/live-viewer-count";
import RemoteImage from "@/components/ui/RemoteImage";
import type { LiveReactionEvent } from "@/hooks/live/useLiveRoom";
import type { LiveReactionType } from "@/types/live";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { MediaStream } from "react-native-webrtc";
import VideoCallView from "@/components/video/video-call-view";

type LiveStageProps = {
  connected: boolean;
  error?: string | null;
  viewerCount: number;
  reactions: LiveReactionEvent[];
  fullscreen: boolean;
  keyboardVisible?: boolean;
  topInset?: number;
  bottomInset?: number;
  label: string;
  hint: string;
  coverUri?: string | null;
  onToggleFullscreen: () => void;
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
  fullscreen,
  keyboardVisible = false,
  topInset = 0,
  bottomInset = 16,
  label,
  hint,
  coverUri,
  onToggleFullscreen,
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

  return (
    <View
      style={[
        styles.stage,
        fullscreen ? styles.stageFullscreen : null,
        !fullscreen && keyboardVisible ? styles.stageCompact : null,
      ]}
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

      {connected && (localStream || onOpenComments) ? (
        <View
          style={[styles.captureStatus, fullscreen && styles.captureStatusFullscreen]}
        >
          {fullscreen ? (
            <TouchableOpacity
              style={[styles.captureStatusItem, styles.captureStatusItemFullscreen]}
              onPress={onToggleFullscreen}
              accessibilityRole="button"
              accessibilityLabel="Изход от цял екран"
            >
              <Ionicons name="contract-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : null}
          {fullscreen && !localStream && topRight ? (
            <View style={styles.captureStatusEnd}>{topRight}</View>
          ) : null}
          {fullscreen && onOpenComments ? (
            <TouchableOpacity
              onPress={onOpenComments}
              style={[styles.captureStatusItem, styles.captureStatusItemFullscreen]}
              accessibilityRole="button"
              accessibilityLabel="Отвори всички коментари"
            >
              <Ionicons name="chatbubbles-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : null}
          {fullscreen && onOpenTalkers ? (
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
            style={[styles.captureStatusItem, fullscreen && styles.captureStatusItemFullscreen]}
            onPress={onSwitchCamera}
            disabled={!onSwitchCamera || !cameraEnabled}
            accessibilityRole="button"
            accessibilityLabel="Превключи камерата"
          >
            <Ionicons name="camera-reverse-outline" size={fullscreen ? 20 : 14} color="#ffffff" />
            {fullscreen ? null : <Text style={styles.captureStatusText}>Смени камерата</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.captureStatusItem,
              fullscreen && styles.captureStatusItemFullscreen,
              !cameraEnabled && styles.captureStatusItemOff,
            ]}
            onPress={onToggleCamera}
            disabled={!onToggleCamera}
            accessibilityRole="button"
            accessibilityLabel={cameraEnabled ? "Изключи камерата" : "Включи камерата"}
          >
            <Ionicons
              name={cameraEnabled ? "videocam" : "videocam-off"}
              size={fullscreen ? 20 : 14}
              color={cameraEnabled ? "#bbf7d0" : "#fecaca"}
            />
            {fullscreen ? null : (
              <Text style={styles.captureStatusText}>
                Камера {cameraEnabled ? "включена" : "изключена"}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.captureStatusItem,
              fullscreen && styles.captureStatusItemFullscreen,
              !microphoneEnabled && styles.captureStatusItemOff,
            ]}
            onPress={onToggleMicrophone}
            disabled={!onToggleMicrophone}
            accessibilityRole="button"
            accessibilityLabel={microphoneEnabled ? "Изключи микрофона" : "Включи микрофона"}
          >
            <Ionicons
              name={microphoneEnabled ? "mic" : "mic-off"}
              size={fullscreen ? 20 : 14}
              color={microphoneEnabled ? "#bbf7d0" : "#fecaca"}
            />
            {fullscreen ? null : (
              <Text style={styles.captureStatusText}>
                Микрофон {microphoneEnabled ? "включен" : "изключен"}
              </Text>
            )}
          </TouchableOpacity>
            </>
          ) : null}
          {fullscreen && localStream && topRight ? (
            <View style={styles.captureStatusEnd}>{topRight}</View>
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
      {!hasMediaStream && connected && !fullscreen && !keyboardVisible ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}

      <View style={[styles.topBar, { top: fullscreen ? 8 : 12 + topInset }]}>
        <View style={styles.topLeft}>
          {topLeft}
          {fullscreen ? null : (
            <TouchableOpacity
              onPress={onToggleFullscreen}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Цял екран"
            >
              <Ionicons name="expand-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.topRight, fullscreen && styles.topRightFullscreen]}>
          {fullscreen ? null : topRight}
          {fullscreen ? null : onOpenComments ? (
            <TouchableOpacity
              onPress={onOpenComments}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Отвори всички коментари"
            >
              <Ionicons name="chatbubbles-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : null}
          <LiveViewerCount count={viewerCount} variant="overlay" />
        </View>
      </View>

      <View
        style={[
          styles.reactionRail,
          { top: fullscreen ? 104 : 52 + topInset, bottom: bottomInset },
        ]}
      >
        <LiveReactions vertical limit={5} onMore={onOpenMoreReactions} onReact={onReact} />
      </View>

      {children}

      <LiveReactionBurst
        reactions={reactions}
        showChips
        chipBottom={fullscreen ? "34%" : 14}
        liftDistance={fullscreen ? 500 : 220}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 240,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#0b1220",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stageCompact: {
    height: 132,
  },
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
  hint: {
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
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
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topRightFullscreen: {
    position: "absolute",
    top: 48,
    right: 0,
  },
  captureStatusEnd: { marginTop: 0 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(8, 12, 24, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  reactionRail: {
    position: "absolute",
    right: 10,
    width: 48,
    zIndex: 4,
  },
  captureStatus: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(8, 12, 24, 0.72)",
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
  captureStatusText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
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
