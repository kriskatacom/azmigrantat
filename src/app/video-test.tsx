import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import IncomingCall from "@/components/video/incoming-call";
import OutgoingCall from "@/components/video/outgoing-call";
import VideoCallControls from "@/components/video/video-call-controls";
import VideoCallView from "@/components/video/video-call-view";
import { useVideoCall } from "@/hooks/video/useVideoCall";

const TEST_RECIPIENT_ID = 22;

export default function VideoTestScreen() {
  const {
    localStream,
    remoteStream,

    incomingCall,
    isInCall,
    callState,

    isMicrophoneEnabled,
    isCameraEnabled,

    startCamera,
    stopCamera,

    startCall,
    acceptCall,
    rejectCall,
    endCall,

    toggleMicrophone,
    toggleCamera,
    switchCamera,
  } = useVideoCall({
    recipientId: TEST_RECIPIENT_ID,
  });

  return (
    <SafeAreaView style={styles.container}>
      <VideoCallView localStream={localStream} remoteStream={remoteStream} />

      <OutgoingCall
        visible={callState === "calling"}
        name="Потребител"
        onCancel={endCall}
      />

      <IncomingCall
        visible={callState === "ringing" && incomingCall !== null}
        onAccept={() => void acceptCall()}
        onReject={rejectCall}
      />

      {callState !== "calling" && callState !== "ringing" && (
        <VideoCallControls
          isInCall={isInCall}
          isMicrophoneEnabled={isMicrophoneEnabled}
          isCameraEnabled={isCameraEnabled}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
          onStartCall={startCall}
          onEndCall={endCall}
          onToggleMicrophone={toggleMicrophone}
          onToggleCamera={toggleCamera}
          onSwitchCamera={switchCamera}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});
