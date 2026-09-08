import { useAppTheme } from "@/app/_layout";
import type { CallType } from "@/services/video-call";
import { Ionicons } from "@expo/vector-icons";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Image } from "expo-image";
import { toPublicFileUrl } from "@/utils/public-file-url";
import { useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RINGTONE = require("../../../assets/sounds/phone_call.wav");
const RINGTONE_REFRESH_MS = 2_000;

type Props = {
  visible: boolean;
  ringing?: boolean;
  name?: string;
  image?: string | null;
  status?: string;
  callType?: CallType;
  canCancel?: boolean;
  onCancel: () => void;
};

export default function OutgoingCall({
  visible,
  ringing = false,
  name = "Потребител",
  image = null,
  status = "Повикване…",
  callType = "video",
  canCancel = true,
  onCancel,
}: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 700;
  const avatarSize = compact ? 112 : 136;
  const isAudio = callType === "audio";
  const colors = theme.colors;

  useEffect(() => {
    if (!visible || !ringing) {
      return;
    }

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    const player = createAudioPlayer(RINGTONE, {
      keepAudioSessionActive: true,
    });
    player.loop = false;

    const replay = () => {
      if (cancelled) {
        return;
      }

      void player.seekTo(0).then(() => {
        if (cancelled) {
          return;
        }
        player.play();
      });
    };

    void setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: "doNotMix",
    })
      .then(() => {
        if (cancelled) {
          return;
        }
        player.play();
        refreshTimer = setInterval(replay, RINGTONE_REFRESH_MS);
      })
      .catch((error: unknown) => {
        console.error("Мелодията за изходящо обаждане не стартира:", error);
      });

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      player.pause();
      player.release();
    };
  }, [ringing, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 28,
          paddingBottom: insets.bottom + 28,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.kindBadge,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name={isAudio ? "call" : "videocam"}
            size={16}
            color={colors.primary}
          />
          <Text style={[styles.kindText, { color: colors.primary }]}>
            {isAudio ? "Аудио обаждане" : "Видео обаждане"}
          </Text>
        </View>
      </View>

      <View style={styles.identity}>
        <View
          style={[
            styles.avatarRing,
            {
              width: avatarSize + 16,
              height: avatarSize + 16,
              borderRadius: (avatarSize + 16) / 2,
              borderColor: colors.primary,
              backgroundColor: colors.surface,
            },
          ]}
        >
          {image ? (
            <Image
              accessibilityLabel={`Снимка на ${name}`}
              contentFit="cover"
              source={{ uri: toPublicFileUrl(image) ?? image }}
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              }}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                  backgroundColor: colors.card,
                },
              ]}
            >
              <Ionicons
                name={isAudio ? "call" : "person"}
                size={compact ? 42 : 52}
                color={colors.textSecondary}
              />
            </View>
          )}
        </View>

        <Text
          numberOfLines={2}
          style={[styles.name, { color: colors.text, fontSize: compact ? 26 : 30 }]}
        >
          {name}
        </Text>
        <Text selectable style={[styles.status, { color: colors.textSecondary }]}>
          {status}
        </Text>
      </View>

      {canCancel ? (
        <View style={styles.actions}>
          <View style={styles.action}>
            <TouchableOpacity
              accessibilityLabel="Прекрати обаждането"
              accessibilityRole="button"
              onPress={onCancel}
              style={[styles.endButton, { backgroundColor: colors.danger }]}
            >
              <Ionicons name="call" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>
              Прекрати
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.actions} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  header: {
    alignItems: "center",
  },
  kindBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  kindText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  identity: {
    alignItems: "center",
    gap: 16,
  },
  avatarRing: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    maxWidth: 320,
    fontWeight: "800",
    textAlign: "center",
  },
  status: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  actions: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  action: {
    alignItems: "center",
    gap: 10,
  },
  endButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "135deg" }],
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
});
