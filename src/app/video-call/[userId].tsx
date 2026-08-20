import OutgoingCall from "@/components/video/outgoing-call";
import VideoCallControls from "@/components/video/video-call-controls";
import VideoCallView from "@/components/video/video-call-view";
import { useIncomingVideoCall } from "@/contexts/VideoCallContext";
import { useAuth } from "@/hooks/useAuth";
import { useVideoCall } from "@/hooks/video/useVideoCall";
import {
  useLocalSearchParams,
  useRootNavigationState,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VideoCallScreen() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const params = useLocalSearchParams<{
    userId?: string | string[];
    name?: string | string[];
    direction?: string | string[];
  }>();
  const hasStartedCallRef = useRef(false);
  const hasLeftScreenRef = useRef(false);
  const rootNavigationState = useRootNavigationState();

  const recipientId = useMemo(() => {
    const rawUserId = Array.isArray(params.userId)
      ? params.userId[0]
      : params.userId;
    if (!rawUserId) return NaN;

    const parsedUserId = Number(rawUserId);
    return Number.isInteger(parsedUserId) && parsedUserId > 0
      ? parsedUserId
      : NaN;
  }, [params.userId]);

  const recipientName = Array.isArray(params.name)
    ? params.name[0]
    : params.name;
  const direction = Array.isArray(params.direction)
    ? params.direction[0]
    : params.direction;
  const {
    acceptedIncomingCall,
    claimActiveCall,
    clearAcceptedIncomingCall,
    releaseActiveCall,
  } = useIncomingVideoCall();
  const matchingIncomingCall =
    direction === "incoming" &&
    acceptedIncomingCall?.call.sender_id === recipientId
      ? acceptedIncomingCall
      : null;
  const isValidRecipient =
    Number.isInteger(recipientId) &&
    recipientId > 0 &&
    user !== null &&
    Number(user.id) !== recipientId;

  const {
    localStream,
    remoteStream,
    isInCall,
    callState,
    callDurationSeconds,
    isMicrophoneEnabled,
    isCameraEnabled,
    startCamera,
    stopCamera,
    startCall,
    endCall,
    toggleMicrophone,
    toggleCamera,
    switchCamera,
  } = useVideoCall({
    recipientId,
    currentUserId: user ? Number(user.id) : undefined,
    acceptedIncomingCall: matchingIncomingCall?.call,
    pendingIncomingIceCandidates:
      matchingIncomingCall?.pendingIceCandidates ?? [],
    onIncomingCallAccepted: clearAcceptedIncomingCall,
    claimActiveCall,
    releaseActiveCall,
  });

  const terminalStatus = useMemo(() => {
    switch (callState) {
      case "busy":
        return "Потребителят е зает";
      case "timeout":
        return "Няма отговор";
      case "rejected":
        return "Обаждането е отказано";
      case "failed":
        return "Неуспешно обаждане";
      case "connection_timeout":
        return "Неуспешно свързване";
      case "cancelled":
        return "Обаждането е прекратено";
      case "ended":
        return "Разговорът приключи";
      case "connecting":
        return "Свързване...";
      default:
        return "Обаждане...";
    }
  }, [callState]);
  const formattedDuration = `${Math.floor(callDurationSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(callDurationSeconds % 60)
    .toString()
    .padStart(2, "0")}`;

  const leaveVideoCallScreen = useCallback(() => {
    if (hasLeftScreenRef.current || !rootNavigationState?.key) {
      return;
    }

    hasLeftScreenRef.current = true;

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/inbox");
  }, [rootNavigationState?.key, router]);

  useEffect(() => {
    if (
      direction !== "incoming" ||
      matchingIncomingCall ||
      callState !== "idle"
    ) {
      return;
    }

    const timeout = setTimeout(leaveVideoCallScreen, 8_000);
    return () => clearTimeout(timeout);
  }, [callState, direction, leaveVideoCallScreen, matchingIncomingCall]);

  useEffect(() => {
    if (
      ![
        "ended",
        "rejected",
        "busy",
        "timeout",
        "cancelled",
        "failed",
        "connection_timeout",
      ].includes(callState)
    ) {
      return;
    }

    const timeout = setTimeout(leaveVideoCallScreen, 1_600);

    return () => clearTimeout(timeout);
  }, [callState, leaveVideoCallScreen]);

  const handleEndCall = useCallback(() => {
    endCall();
  }, [endCall]);

  if (!isAuthLoading && !isValidRecipient) {
    return (
      <SafeAreaView style={styles.invalidContainer}>
        <Text selectable style={styles.invalidTitle}>
          Невалиден получател
        </Text>
        <Text selectable style={styles.invalidMessage}>
          Видео разговорът не може да бъде стартиран към този потребител.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={leaveVideoCallScreen}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <VideoCallView localStream={localStream} remoteStream={remoteStream} />

      <OutgoingCall
        visible={[
          "calling",
          "connecting",
          "busy",
          "timeout",
          "rejected",
          "failed",
          "connection_timeout",
          "cancelled",
          "ended",
        ].includes(callState)}
        ringing={callState === "calling"}
        name={recipientName ?? "Потребител"}
        status={terminalStatus}
        canCancel={callState === "calling" || callState === "connecting"}
        onCancel={handleEndCall}
      />

      {callState === "connected" ? (
        <Text selectable style={styles.duration}>
          {formattedDuration}
        </Text>
      ) : null}

      {callState === "idle" || callState === "connected" ? (
        <VideoCallControls
          isInCall={isInCall}
          isMicrophoneEnabled={isMicrophoneEnabled}
          isCameraEnabled={isCameraEnabled}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
          onStartCall={startCall}
          onEndCall={handleEndCall}
          onToggleMicrophone={toggleMicrophone}
          onToggleCamera={toggleCamera}
          onSwitchCamera={switchCamera}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  invalidContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#09090b",
  },
  invalidTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  invalidMessage: {
    color: "#a1a1aa",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  backButton: {
    minHeight: 46,
    marginTop: 8,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#2563eb",
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  duration: {
    position: "absolute",
    top: 24,
    alignSelf: "center",
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
});
