import { SafeAreaView } from "react-native-safe-area-context";

import VideoCallControls from "@/components/video/video-call-controls";
import VideoCallView from "@/components/video/video-call-view";
import { useVideoCall } from "@/hooks/video/useVideoCall";
import { StyleSheet } from "react-native";

const TEST_RECIPIENT_ID = 22;

export default function VideoTestScreen() {
  const {
    localStream,
    remoteStream,
    isInCall,
    startCamera,
    stopCamera,
    startCall,
    endCall,
  } = useVideoCall({
    recipientId: TEST_RECIPIENT_ID,
  });

  return (
    <SafeAreaView style={styles.container}>
      <VideoCallView localStream={localStream} remoteStream={remoteStream} />

      <VideoCallControls
        isInCall={isInCall}
        onStartCamera={startCamera}
        onStopCamera={stopCamera}
        onStartCall={startCall}
        onEndCall={endCall}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  videoContainer: {
    flex: 1,
  },

  video: {
    flex: 1,
  },

  buttons: {
    padding: 20,
    gap: 12,
  },
});
