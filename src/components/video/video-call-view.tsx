import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
};

function CameraOffState({
  name,
  avatarUrl,
  compact = false,
}: {
  name: string;
  avatarUrl?: string | null;
  compact?: boolean;
}) {
  const avatarSize = compact ? 48 : 128;
  const iconSize = compact ? 16 : 22;

  return (
    <View style={[styles.cameraOff, compact && styles.cameraOffCompact]}>
      {avatarUrl ? (
        <Image
          accessibilityLabel={`Снимка на ${name}`}
          contentFit="cover"
          source={{ uri: avatarUrl }}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          }}
        />
      ) : (
        <View
          style={[
            styles.cameraOffAvatarPlaceholder,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            },
          ]}
        >
          <Ionicons name="person" size={compact ? 22 : 48} color="#dbeafe" />
        </View>
      )}
      <View style={[styles.cameraOffBadge, compact && styles.cameraOffBadgeCompact]}>
        <Ionicons name="videocam-off" size={iconSize} color="#f8fafc" />
      </View>
      {compact ? null : (
        <>
          <Text style={styles.cameraOffName}>{name}</Text>
          <Text style={styles.cameraOffText}>Камерата е изключена</Text>
        </>
      )}
      {compact ? (
        <Text numberOfLines={1} style={styles.localCameraOffText}>
          Камерата е изключена
        </Text>
      ) : null}
    </View>
  );
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
}: Props) {
  const showRemoteVideo = Boolean(remoteStream) && isRemoteCameraEnabled;
  const showLocalVideo = Boolean(localStream) && isCameraEnabled;
  const showLocalPip = Boolean(remoteStream);
  const showLocalFullscreen = !remoteStream && showLocalVideo;

  return (
    <View style={styles.videoContainer}>
      {showRemoteVideo ? (
        <RTCView
          key={`${remoteStream!.id}-on`}
          streamURL={remoteStream!.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror={false}
          zOrder={0}
        />
      ) : showLocalFullscreen ? (
        <RTCView
          streamURL={localStream!.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror
          zOrder={0}
        />
      ) : (
        <CameraOffState name={displayName} avatarUrl={avatarUrl} />
      )}

      {showLocalPip ? (
        <View style={styles.localPreview}>
          {showLocalVideo ? (
            <RTCView
              streamURL={localStream!.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              mirror
              zOrder={1}
            />
          ) : (
            <CameraOffState
              compact
              name={localName}
              avatarUrl={localAvatarUrl}
            />
          )}
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

  cameraOff: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#0b1220",
  },

  cameraOffCompact: {
    gap: 8,
    paddingHorizontal: 8,
  },

  cameraOffAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#164e63",
  },

  cameraOffBadge: {
    width: 48,
    height: 48,
    marginTop: -28,
    marginBottom: 4,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    borderWidth: 2,
    borderColor: "#334155",
  },

  cameraOffBadgeCompact: {
    width: 28,
    height: 28,
    marginTop: -16,
    marginBottom: 0,
    borderRadius: 14,
  },

  cameraOffName: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
  },

  cameraOffText: {
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "600",
  },

  localCameraOffText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  localPreview: {
    position: "absolute",
    top: 20,
    right: 16,
    width: 110,
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0f172a",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    elevation: 8,
  },

  localVideo: {
    width: "100%",
    height: "100%",
  },
});
