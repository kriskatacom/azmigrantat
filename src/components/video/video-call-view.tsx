import { StyleSheet, View } from "react-native";
import { MediaStream, RTCView } from "react-native-webrtc";

type Props = {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
};

export default function VideoCallView({ localStream, remoteStream }: Props) {
  return (
    <View style={styles.videoContainer}>
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror={false}
          zOrder={0}
        />
      ) : null}

      {!remoteStream && localStream ? (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror
          zOrder={0}
        />
      ) : null}

      {remoteStream && localStream ? (
        <View style={styles.localPreview}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror
            zOrder={1}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000",
    overflow: "hidden",
  },

  remoteVideo: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },

  localPreview: {
    position: "absolute",
    top: 20,
    right: 16,
    width: 110,
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    elevation: 8,
  },

  localVideo: {
    width: "100%",
    height: "100%",
  },
});
