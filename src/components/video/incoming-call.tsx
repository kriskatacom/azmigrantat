import { Ionicons } from "@expo/vector-icons";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RINGTONE = require("../../../assets/sounds/incoming_call.wav");

type IncomingCallProps = {
  visible: boolean;
  callerName?: string | null;
  callerImage?: string | null;
  connecting?: boolean;
  onAccept: () => void;
  onReject: () => void;
};

function PulseRing({ delay, size }: { delay: number; size: number }) {
  const [scale] = useState(() => new Animated.Value(0.72));
  const [opacity] = useState(() => new Animated.Value(0.42));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.18,
            duration: 2200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.72,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.42,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [delay, opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulse,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

export default function IncomingCall({
  visible,
  callerName,
  callerImage,
  connecting = false,
  onAccept,
  onReject,
}: IncomingCallProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 700;
  const avatarSize = compact ? 128 : 156;
  const [closedByAccept, setClosedByAccept] = useState(false);

  useEffect(() => {
    if (!visible) {
      setClosedByAccept(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || connecting || closedByAccept) {
      return;
    }

    let cancelled = false;
    const player = createAudioPlayer(RINGTONE, {
      keepAudioSessionActive: true,
    });
    player.loop = true;

    void setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: "doNotMix",
    })
      .then(() => {
        if (cancelled) return;
        player.play();
      })
      .catch((error: unknown) => {
        console.error("Мелодията за входящо обаждане не стартира:", error);
      });

    return () => {
      cancelled = true;
      player.release();
    };
  }, [closedByAccept, connecting, visible]);

  if (!visible || closedByAccept) {
    return null;
  }

  return (
    <View
      accessibilityViewIsModal
      pointerEvents="auto"
      style={[
        styles.screen,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <View style={styles.glow} />
      <View style={styles.header}>
        <Text selectable style={styles.brand}>
          Видео разговор
        </Text>
        <Text selectable style={styles.subtitle}>
          {connecting
            ? "Свързване към обаждането..."
            : "Входящо видео обаждане"}
        </Text>
      </View>

      <View style={styles.identity}>
        <View
          style={[
            styles.avatarWrap,
            { width: avatarSize + 84, height: avatarSize + 84 },
          ]}
        >
          <PulseRing delay={0} size={avatarSize + 84} />
          <PulseRing delay={700} size={avatarSize + 84} />
          <PulseRing delay={1400} size={avatarSize + 84} />
          {callerImage ? (
            <Image
              accessibilityLabel={`Снимка на ${callerName ?? "повикващия"}`}
              contentFit="cover"
              source={{ uri: callerImage }}
              style={[
                styles.avatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            >
              <Ionicons
                name="person"
                size={compact ? 54 : 64}
                color="#dbeafe"
              />
            </View>
          )}
        </View>
        <Text numberOfLines={2} selectable style={styles.callerName}>
          {callerName ?? "Потребител"}
        </Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.action}>
          <TouchableOpacity
            accessibilityLabel="Откажи обаждането"
            accessibilityRole="button"
            disabled={connecting}
            onPress={onReject}
            style={[
              styles.circleButton,
              styles.declineButton,
              connecting && styles.disabledButton,
            ]}
          >
            <Ionicons name="close" size={36} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Откажи</Text>
        </View>

        <View style={styles.action}>
          <TouchableOpacity
            accessibilityLabel="Приеми видео обаждането"
            accessibilityRole="button"
            disabled={connecting}
            onPress={() => {
              setClosedByAccept(true);
              onAccept();
            }}
            style={[
              styles.circleButton,
              styles.acceptButton,
              connecting && styles.disabledButton,
            ]}
          >
            <Ionicons name="videocam" size={32} color="#082f49" />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Приеми</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    backgroundColor: "#07111f",
  },
  glow: {
    position: "absolute",
    top: "18%",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(56, 189, 248, 0.16)",
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  brand: {
    color: "#7dd3fc",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  identity: {
    alignItems: "center",
    gap: 22,
  },
  avatarWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(125, 211, 252, 0.55)",
    backgroundColor: "rgba(14, 165, 233, 0.08)",
  },
  avatar: {
    borderWidth: 3,
    borderColor: "rgba(186, 230, 253, 0.9)",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#164e63",
  },
  callerName: {
    maxWidth: 320,
    color: "#f8fafc",
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
  },
  actions: {
    width: "100%",
    maxWidth: 360,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  action: {
    alignItems: "center",
    gap: 12,
  },
  circleButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
  },
  declineButton: {
    backgroundColor: "#e11d48",
  },
  acceptButton: {
    backgroundColor: "#38bdf8",
  },
  disabledButton: {
    opacity: 0.55,
  },
  actionLabel: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "700",
  },
});
