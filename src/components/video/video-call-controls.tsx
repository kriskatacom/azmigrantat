import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type VideoCallControlsProps = {
  isInCall: boolean;
  onStartCamera: () => void | Promise<unknown>;
  onStopCamera: () => void;
  onStartCall: () => void | Promise<void>;
  onEndCall: () => void;
};

export default function VideoCallControls({
  isInCall,
  onStartCall,
  onEndCall,
  onStopCamera,
}: VideoCallControlsProps) {
  return (
    <View style={styles.container}>
      {!isInCall ? (
        <TouchableOpacity
          style={[styles.button, styles.callButton]}
          onPress={onStartCall}
        >
          <Ionicons name="videocam" size={26} color="#ffffff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.endButton]}
          onPress={onEndCall}
        >
          <Ionicons name="call" size={26} color="#ffffff" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={onStopCamera}
      >
        <Ionicons name="videocam-off" size={26} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 30,
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
