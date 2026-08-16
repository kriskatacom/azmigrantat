import { FontAwesome } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type AudioMessagePlayerProps = {
  url: string;
  isMe: boolean;
  colors: { text: string; primary: string };
};

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

export default function AudioMessagePlayer({
  url,
  isMe,
  colors,
}: AudioMessagePlayerProps) {
  const player = useAudioPlayer({ uri: url }, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const tintColor = isMe ? "#ffffff" : colors.primary;
  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
      return;
    }

    if (status.didJustFinish || status.currentTime >= status.duration) {
      await player.seekTo(0);
    }
    player.play();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityLabel={status.playing ? "Пауза" : "Пусни аудио съобщението"}
        accessibilityRole="button"
        onPress={() => void togglePlayback()}
        style={[styles.playButton, { backgroundColor: `${tintColor}24` }]}
      >
        <FontAwesome
          name={status.playing ? "pause" : "play"}
          size={17}
          color={tintColor}
        />
      </TouchableOpacity>

      <View style={styles.timeline}>
        <View style={[styles.track, { backgroundColor: `${tintColor}38` }]}>
          <View
            style={[
              styles.progress,
              { backgroundColor: tintColor, width: `${Math.min(progress, 1) * 100}%` },
            ]}
          />
        </View>
        <Text style={[styles.time, { color: isMe ? "#ffffff" : colors.text }]}>
          {formatTime(status.playing ? status.currentTime : status.duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  timeline: {
    flex: 1,
    gap: 6,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progress: {
    height: "100%",
    borderRadius: 2,
  },
  time: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
});
