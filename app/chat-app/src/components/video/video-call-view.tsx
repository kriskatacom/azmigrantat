import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { MediaStream, RTCView } from "react-native-webrtc";

const PIP_WIDTH = 110;
const PIP_HEIGHT = 160;
const PIP_EDGE_GAP = 16;
const PIP_BOTTOM_GAP = 210;

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

function DraggableLocalPreview({
  children,
  containerWidth,
  containerHeight,
}: {
  children: ReactNode;
  containerWidth: number;
  containerHeight: number;
}) {
  const position = useRef(new Animated.ValueXY()).current;
  const positionRef = useRef({ x: 0, y: 0 });
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const initializedRef = useRef(false);
  const boundsRef = useRef({ maxX: 0, maxY: 0 });

  const setPosition = useCallback((x: number, y: number) => {
    const nextPosition = {
      x: Math.max(0, Math.min(x, boundsRef.current.maxX)),
      y: Math.max(0, Math.min(y, boundsRef.current.maxY)),
    };
    positionRef.current = nextPosition;
    position.setValue(nextPosition);
  }, [position]);

  boundsRef.current = {
    maxX: Math.max(0, containerWidth - PIP_WIDTH),
    maxY: Math.max(0, containerHeight - PIP_HEIGHT),
  };

  if (containerWidth > 0 && containerHeight > 0) {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setPosition(
        containerWidth - PIP_WIDTH - PIP_EDGE_GAP,
        containerHeight - PIP_HEIGHT - PIP_BOTTOM_GAP,
      );
    } else if (
      positionRef.current.x > boundsRef.current.maxX ||
      positionRef.current.y > boundsRef.current.maxY
    ) {
      setPosition(positionRef.current.x, positionRef.current.y);
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
      onPanResponderGrant: () => {
        dragOriginRef.current = positionRef.current;
      },
      onPanResponderMove: (_event, gestureState) => {
        setPosition(
          dragOriginRef.current.x + gestureState.dx,
          dragOriginRef.current.y + gestureState.dy,
        );
      },
    }),
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.pipPreview,
        { opacity: initializedRef.current ? 1 : 0, transform: position.getTranslateTransform() },
      ]}
    >
      {children}
    </Animated.View>
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
  localMirror = true,
}: Props) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const remoteVideoTrack = remoteStream?.getVideoTracks()[0];
  const showRemoteVideo = Boolean(remoteVideoTrack && remoteVideoTrack.enabled !== false && isRemoteCameraEnabled);
  const showLocalVideo = Boolean(localStream) && isCameraEnabled;

  return (
    <View
      style={styles.videoContainer}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setContainerSize((current) =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        );
      }}
    >
      <ParticipantSurface
        stream={remoteStream}
        showVideo={showRemoteVideo}
        name={displayName}
        avatarUrl={avatarUrl}
        zOrder={0}
      />

      {localStream ? (
        <DraggableLocalPreview
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        >
          <ParticipantSurface
            stream={localStream}
            showVideo={showLocalVideo}
            name={localName}
            avatarUrl={localAvatarUrl}
            mirror={localMirror}
            zOrder={1}
          />
        </DraggableLocalPreview>
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
    left: 0,
    top: 0,
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0f172a",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    elevation: 8,
    zIndex: 2,
  },
});
