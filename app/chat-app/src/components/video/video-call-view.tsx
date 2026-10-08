import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { MediaStream, RTCView } from "react-native-webrtc";

type Props = {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCameraEnabled?: boolean;
  isRemoteCameraEnabled?: boolean;
  displayName?: string;
  avatarUrl?: string | null;
  localName?: string;
  localAvatarUrl?: string | null;
  localMirror?: boolean;
};

function CameraOffState({ name }: { name: string }) {
  return (
    <View style={styles.cameraOff}>
      <View style={styles.cameraOffAvatar}>
        <Ionicons name="person" size={52} color="#dbeafe" />
      </View>
      <View style={styles.cameraOffBadge}>
        <Ionicons name="videocam-off" size={20} color="#f8fafc" />
      </View>
      <Text style={styles.cameraOffName}>{name}</Text>
      <Text style={styles.cameraOffText}>Камерата е изключена</Text>
    </View>
  );
}

function ParticipantSurface({
  stream,
  showVideo,
  name,
  avatarUrl,
  mirror = false,
  zOrder,
}: {
  stream: MediaStream | null;
  showVideo: boolean;
  name: string;
  avatarUrl?: string | null;
  mirror?: boolean;
  zOrder: number;
}) {
  const videoTrack = stream?.getVideoTracks()[0];
  const videoVisible = Boolean(showVideo && videoTrack && videoTrack.enabled !== false);

  if (videoVisible && stream) {
    return (
      <RTCView
        key={`${stream.id}-video`}
        streamURL={stream.toURL()}
        style={styles.remoteVideo}
        objectFit="cover"
        mirror={mirror}
        zOrder={zOrder}
      />
    );
  }

  return <View key={`${stream?.id ?? name}-camera-off`} style={styles.cameraOffSurface}>
    <CameraOffState name={name} />
  </View>;
}

export default function VideoCallView({
  localStream,
  remoteStream,
  isCameraEnabled = true,
  isRemoteCameraEnabled = true,
  displayName = "Потребител",
  avatarUrl = null,
  localName = "Вие",
  localAvatarUrl = null,
  localMirror = true,
}: Props) {
  const remoteVideoTrack = remoteStream?.getVideoTracks()[0];
  const showRemoteVideo = Boolean(remoteVideoTrack && remoteVideoTrack.enabled !== false && isRemoteCameraEnabled);
  const showLocalVideo = Boolean(localStream) && isCameraEnabled;

  return (
    <View style={styles.videoContainer}>
      <ParticipantSurface
        stream={remoteStream}
        showVideo={showRemoteVideo}
        name={displayName}
        avatarUrl={avatarUrl}
        zOrder={0}
      />

      {localStream ? (
        <View style={styles.pipPreview}>
          <ParticipantSurface
            stream={localStream}
            showVideo={showLocalVideo}
            name={localName}
            avatarUrl={localAvatarUrl}
            mirror={localMirror}
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
    width: "100%",
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

  cameraOff: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#0b1220",
  },

  cameraOffSurface: {
    ...StyleSheet.absoluteFill,
  },

  cameraOffAvatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#164e63",
  },

  cameraOffBadge: {
    width: 44,
    height: 44,
    marginTop: -32,
    marginBottom: 4,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    borderWidth: 2,
    borderColor: "#334155",
  },

  cameraOffName: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
  cameraOffText: { color: "#cbd5e1", fontSize: 14, fontWeight: "700" },

  pipPreview: {
    position: "absolute",
    right: 16,
    bottom: 210,
    width: 110,
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0f172a",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    elevation: 8,
  },

  pipHitArea: {
    ...StyleSheet.absoluteFill,
  },

  pipVideo: {
    width: "100%",
    height: "100%",
  },
});
