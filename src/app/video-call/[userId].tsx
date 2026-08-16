import OutgoingCall from "@/components/video/outgoing-call";
import VideoCallControls from "@/components/video/video-call-controls";
import VideoCallView from "@/components/video/video-call-view";
import { useIncomingVideoCall } from "@/contexts/VideoCallContext";
import { useAuth } from "@/hooks/useAuth";
import { useVideoCall } from "@/hooks/video/useVideoCall";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const { acceptedIncomingCall, clearAcceptedIncomingCall } =
    useIncomingVideoCall();
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
    acceptedIncomingCall: matchingIncomingCall?.call,
    pendingIncomingIceCandidates:
      matchingIncomingCall?.pendingIceCandidates ?? [],
    onIncomingCallAccepted: clearAcceptedIncomingCall,
  });

  useEffect(() => {
    if (
      isAuthLoading ||
      !isValidRecipient ||
      direction === "incoming" ||
      hasStartedCallRef.current
    ) return;

    hasStartedCallRef.current = true;
    void startCall().catch((error: unknown) => {
      Alert.alert(
        "Видео обаждането не стартира",
        error instanceof Error ? error.message : "Възникна неочаквана грешка.",
      );
    });
  }, [direction, isAuthLoading, isValidRecipient, startCall]);

  useEffect(() => {
    if (callState === "ended" || callState === "rejected") {
      router.back();
    }
  }, [callState, router]);

  const handleEndCall = useCallback(() => {
    endCall();
    router.back();
  }, [endCall, router]);

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
          onPress={() => router.back()}
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
        visible={callState === "calling"}
        name={recipientName ?? "Потребител"}
        onCancel={handleEndCall}
      />

      {callState !== "calling" && callState !== "ringing" ? (
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
});
