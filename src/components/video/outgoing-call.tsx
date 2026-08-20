import { Ionicons } from "@expo/vector-icons";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const RINGTONE = require("../../../assets/sounds/phone_call.wav");

type Props = {
  visible: boolean;
  ringing?: boolean;
  name?: string;
  status?: string;
  canCancel?: boolean;
  onCancel: () => void;
};

export default function OutgoingCall({
  visible,
  ringing = false,
  name = "Потребител",
  status = "Обаждане...",
  canCancel = true,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!visible || !ringing) {
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
        console.error("Мелодията за изходящо обаждане не стартира:", error);
      });

    return () => {
      cancelled = true;
      player.release();
    };
  }, [ringing, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={42} color="#ffffff" />
      </View>

      <Text style={styles.name}>{name}</Text>

      <Text selectable style={styles.status}>{status}</Text>

      {canCancel ? (
        <TouchableOpacity style={styles.endButton} onPress={onCancel}>
          <Ionicons name="call" size={30} color="#ffffff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#111827",
    zIndex: 20,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#374151",

    marginBottom: 20,
  },

  name: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "600",
  },

  status: {
    marginTop: 8,

    color: "#9ca3af",
    fontSize: 16,
  },

  endButton: {
    position: "absolute",
    bottom: 50,

    width: 64,
    height: 64,
    borderRadius: 32,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#ef4444",
  },
});
