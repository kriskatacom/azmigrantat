import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useEffect } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const RINGTONE = require("../../../assets/sounds/incoming-call.wav");

type IncomingCallProps = {
  visible: boolean;
  callerName?: string | null;
  callerImage?: string | null;
  onAccept: () => void;
  onReject: () => void;
};

export default function IncomingCall({
  visible,
  callerName,
  callerImage,
  onAccept,
  onReject,
}: IncomingCallProps) {
  const ringtonePlayer = useAudioPlayer(RINGTONE, {
    keepAudioSessionActive: true,
  });

  useEffect(() => {
    if (!visible) {
      ringtonePlayer.pause();
      void ringtonePlayer.seekTo(0);
      return;
    }

    let cancelled = false;
    void setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: "doNotMix",
    })
      .then(() => {
        if (cancelled) return;
        ringtonePlayer.loop = true;
        ringtonePlayer.play();
      })
      .catch((error: unknown) => {
        console.error("Мелодията за входящо обаждане не стартира:", error);
      });

    return () => {
      cancelled = true;
      ringtonePlayer.pause();
      void ringtonePlayer.seekTo(0);
    };
  }, [ringtonePlayer, visible]);

  return (
    <Modal animationType="fade" onRequestClose={onReject} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {callerImage ? (
            <Image
              accessibilityLabel={`Снимка на ${callerName ?? "повикващия"}`}
              contentFit="cover"
              source={{ uri: callerImage }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={52} color="#d4d4d8" />
            </View>
          )}
          <Text numberOfLines={1} selectable style={styles.callerName}>
            {callerName ?? "Потребител"}
          </Text>
          <Text selectable style={styles.title}>Входящо видео обаждане</Text>
          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" onPress={onReject} style={[styles.button, styles.rejectButton]}>
              <Text style={styles.buttonText}>Откажи</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={onAccept} style={[styles.button, styles.acceptButton]}>
              <Text style={styles.buttonText}>Приеми</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(0, 0, 0, 0.72)" },
  card: { width: "100%", maxWidth: 380, alignItems: "center", padding: 24, borderRadius: 20, gap: 16, backgroundColor: "#18181b" },
  avatar: { width: 112, height: 112, borderRadius: 56 },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#3f3f46" },
  callerName: { maxWidth: "100%", color: "#ffffff", fontSize: 25, fontWeight: "800", textAlign: "center" },
  title: { color: "#a1a1aa", fontSize: 16, fontWeight: "600", textAlign: "center" },
  actions: { width: "100%", flexDirection: "row", gap: 12 },
  button: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  rejectButton: { backgroundColor: "#ef4444" },
  acceptButton: { backgroundColor: "#22c55e" },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});
