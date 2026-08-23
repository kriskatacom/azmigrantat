import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type VideoCallControlsProps = {
  isInCall: boolean;

  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;

  onStartCamera: () => void | Promise<unknown>;
  onStopCamera: () => void;

  onStartCall: () => void | Promise<void>;
  onEndCall: () => void;

  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
};

export default function VideoCallControls({
  isInCall,
  isMicrophoneEnabled,
  isCameraEnabled,
  onStartCamera,
  onStopCamera,
  onStartCall,
  onEndCall,
  onToggleMicrophone,
  onToggleCamera,
  onSwitchCamera,
}: VideoCallControlsProps) {
  return (
    <View style={styles.container}>
      {!isInCall && (
        <>
          <TouchableOpacity
            style={[styles.button, styles.callButton]}
            onPress={() => void onStartCall()}
          >
            <Ionicons name="videocam" size={26} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {isInCall && (
        <>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onToggleMicrophone}
          >
            <Ionicons
              name={isMicrophoneEnabled ? "mic" : "mic-off"}
              size={26}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onToggleCamera}
            accessibilityLabel={
              isCameraEnabled ? "Изключи камерата" : "Включи камерата"
            }
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
            >
              <Ionicons name="camera-reverse" size={26} color="#fff" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.button, styles.endButton]}
            onPress={onEndCall}
          >
            <Ionicons name="call" size={26} color="#fff" />
          </TouchableOpacity>
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
    bottom: 64,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
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
});
