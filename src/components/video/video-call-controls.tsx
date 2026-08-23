import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type VideoCallControlsProps = {
  isInCall: boolean;

  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  isSpeakerEnabled: boolean;
  isRemoteAudioEnabled: boolean;

  onStartCamera: () => void | Promise<unknown>;
  onStopCamera: () => void;

  onStartCall: () => void | Promise<void>;
  onEndCall: () => void;

  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onToggleSpeaker: () => void;
  onToggleRemoteAudio: () => void;
};

export default function VideoCallControls({
  isInCall,
  isMicrophoneEnabled,
  isCameraEnabled,
  isSpeakerEnabled,
  isRemoteAudioEnabled,
  onStartCall,
  onEndCall,
  onToggleMicrophone,
  onToggleCamera,
  onSwitchCamera,
  onToggleSpeaker,
  onToggleRemoteAudio,
}: VideoCallControlsProps) {
  return (
    <View style={styles.container}>
      {!isInCall && (
        <View style={styles.row}>
          <TouchableOpacity
            accessibilityLabel="Стартирай обаждането"
            accessibilityRole="button"
            style={[styles.button, styles.callButton]}
            onPress={() => void onStartCall()}
          >
            <Ionicons name="videocam" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {isInCall && (
        <>
          <View style={styles.row}>
            <TouchableOpacity
              accessibilityLabel={
                isSpeakerEnabled
                  ? "Изключи високоговорителя"
                  : "Включи високоговорителя"
              }
              accessibilityRole="button"
              style={[
                styles.button,
                styles.secondaryButton,
                !isSpeakerEnabled && styles.offButton,
              ]}
              onPress={onToggleSpeaker}
            >
              <Ionicons
                name={isSpeakerEnabled ? "volume-high" : "ear"}
                size={26}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel={
                isRemoteAudioEnabled
                  ? "Заглуши другия участник"
                  : "Включи звука на другия участник"
              }
              accessibilityRole="button"
              style={[
                styles.button,
                styles.secondaryButton,
                !isRemoteAudioEnabled && styles.offButton,
              ]}
              onPress={onToggleRemoteAudio}
            >
              <Ionicons
                name={isRemoteAudioEnabled ? "volume-medium" : "volume-mute"}
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              accessibilityLabel={
                isMicrophoneEnabled ? "Заглуши микрофона" : "Включи микрофона"
              }
              accessibilityRole="button"
              style={[
                styles.button,
                styles.secondaryButton,
                !isMicrophoneEnabled && styles.offButton,
              ]}
              onPress={onToggleMicrophone}
            >
              <Ionicons
                name={isMicrophoneEnabled ? "mic" : "mic-off"}
                size={26}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.secondaryButton,
                !isCameraEnabled && styles.offButton,
              ]}
              onPress={onToggleCamera}
              accessibilityLabel={
                isCameraEnabled ? "Изключи камерата" : "Включи камерата"
              }
              accessibilityRole="button"
            >
              <Ionicons
                name={isCameraEnabled ? "videocam" : "videocam-off"}
                size={26}
                color="#fff"
              />
            </TouchableOpacity>

            {isCameraEnabled ? (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={onSwitchCamera}
                accessibilityLabel="Смени камерата"
                accessibilityRole="button"
              >
                <Ionicons name="camera-reverse" size={26} color="#fff" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              accessibilityLabel="Приключи обаждането"
              accessibilityRole="button"
              style={[styles.button, styles.endButton]}
              onPress={onEndCall}
            >
              <Ionicons name="call" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 48,
    alignItems: "center",
    gap: 14,
  },

  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },

  button: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },

  callButton: {
    backgroundColor: "#22c55e",
  },

  endButton: {
    backgroundColor: "#ef4444",
  },

  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  offButton: {
    backgroundColor: "rgba(239,68,68,0.45)",
  },
});
