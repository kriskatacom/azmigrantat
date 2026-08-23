import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

function ParticipantSurface({
  stream,
  showVideo,
  name,
  avatarUrl,
  compact = false,
  mirror = false,
  zOrder,
}: {
  stream: MediaStream | null;
  showVideo: boolean;
  name: string;
  avatarUrl?: string | null;
  compact?: boolean;
  mirror?: boolean;
  zOrder: number;
}) {
  if (showVideo && stream) {
    return (
      <RTCView
        key={`${stream.id}-${compact ? "pip" : "main"}`}
        streamURL={stream.toURL()}
        style={compact ? styles.pipVideo : styles.remoteVideo}
        objectFit="cover"
        mirror={mirror}
        zOrder={zOrder}
      />
    );
  }

  return <CameraOffState compact={compact} name={name} avatarUrl={avatarUrl} />;
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
  const [localIsPrimary, setLocalIsPrimary] = useState(false);
  const showRemoteVideo = Boolean(remoteStream) && isRemoteCameraEnabled;
  const showLocalVideo = Boolean(localStream) && isCameraEnabled;
  const canSwap = Boolean(remoteStream);
  const primaryIsLocal = canSwap ? localIsPrimary : showLocalVideo;

  return (
    <View style={styles.videoContainer}>
      {primaryIsLocal ? (
        <ParticipantSurface
          stream={localStream}
          showVideo={showLocalVideo}
          name={localName}
          avatarUrl={localAvatarUrl}
          mirror
          zOrder={0}
        />
      ) : (
        <ParticipantSurface
          stream={remoteStream}
          showVideo={showRemoteVideo}
          name={displayName}
          avatarUrl={avatarUrl}
          zOrder={0}
        />
      )}

      {canSwap ? (
        <View style={styles.pipPreview}>
          {primaryIsLocal ? (
            <ParticipantSurface
              compact
              stream={remoteStream}
              showVideo={showRemoteVideo}
              name={displayName}
              avatarUrl={avatarUrl}
              zOrder={1}
            />
          ) : (
            <ParticipantSurface
              compact
              stream={localStream}
              showVideo={showLocalVideo}
              name={localName}
              avatarUrl={localAvatarUrl}
              mirror
              zOrder={1}
            />
          )}
          <Pressable
            accessibilityLabel="Размени изгледа на камерите"
            accessibilityRole="button"
            onPress={() => setLocalIsPrimary((current) => !current)}
            style={styles.pipHitArea}
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
    ...StyleSheet.absoluteFillObject,
  },

  pipVideo: {
    width: "100%",
    height: "100%",
  },
});
