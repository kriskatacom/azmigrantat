import LiveReactionBurst from "@/components/live/live-reaction-burst";
import LiveReactions from "@/components/live/live-reactions";
import LiveViewerCount from "@/components/live/live-viewer-count";
import RemoteImage from "@/components/ui/RemoteImage";
import type { LiveReactionEvent } from "@/hooks/live/useLiveRoom";
import type { LiveReactionType } from "@/types/live";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type LiveStageProps = {
  connected: boolean;
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
  onReact: (type: LiveReactionType) => void;
  topLeft?: ReactNode;
  children?: ReactNode;
};

export default function LiveStage({
  connected,
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
  onReact,
  topLeft,
  children,
}: LiveStageProps) {
  return (
    <View
      style={[
        styles.stage,
        fullscreen ? styles.stageFullscreen : null,
        !fullscreen && keyboardVisible ? styles.stageCompact : null,
      ]}
    >
      {coverUri ? (
        <>
          <RemoteImage uri={coverUri} style={styles.cover} />
          <View pointerEvents="none" style={styles.coverDim} />
        </>
      ) : null}

      {!connected ? (
        <View pointerEvents="none" style={styles.connecting}>
          <Text style={styles.connectingText}>Свързване...</Text>
        </View>
      ) : null}

      <Text style={styles.label}>{label}</Text>
      {!fullscreen && !keyboardVisible ? <Text style={styles.hint}>{hint}</Text> : null}

      <View style={[styles.topBar, { top: fullscreen ? 8 : 12 + topInset }]}>
        <View style={styles.topLeft}>
          {topLeft}
          <TouchableOpacity
            onPress={onToggleFullscreen}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={fullscreen ? "Изход от цял екран" : "Цял екран"}
          >
            <Ionicons
              name={fullscreen ? "contract-outline" : "expand-outline"}
              size={20}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>
        <LiveViewerCount count={viewerCount} variant="overlay" />
      </View>

      <View
        style={[
          styles.reactionRail,
          { top: fullscreen ? 44 : 52 + topInset, bottom: bottomInset },
        ]}
      >
        <LiveReactions vertical onReact={onReact} />
      </View>

      {children}

      <LiveReactionBurst
        reactions={reactions}
        showChips
        chipBottom={fullscreen ? Math.max(bottomInset + 8, 96) : 14}
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
    flex: 1,
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
  cover: {
    ...StyleSheet.absoluteFill,
  },
  coverDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(3, 7, 18, 0.38)",
  },
});
