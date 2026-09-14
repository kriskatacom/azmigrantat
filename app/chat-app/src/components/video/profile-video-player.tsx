import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo";
import { Animated, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

type PlayerColors = { background: string; text: string; textSecondary: string };

export default function ProfileVideoPlayer({
  visible,
  title,
  description,
  url,
  onClose,
  colors,
}: {
  visible: boolean;
  title: string;
  description: string | null;
  url: string | null;
  onClose: () => void;
  colors: PlayerColors;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {url ? <PlayerSurface title={title} description={description} url={url} colors={colors} /> : null}
    </Modal>
  );
}

function PlayerSurface({ title, description, url, colors }: { title: string; description: string | null; url: string; colors: PlayerColors }) {
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
