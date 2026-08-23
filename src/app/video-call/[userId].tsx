import OutgoingCall from "@/components/video/outgoing-call";
import VideoCallControls from "@/components/video/video-call-controls";
import VideoCallView from "@/components/video/video-call-view";
import { useAppTheme } from "@/app/_layout";
import { useIncomingVideoCall } from "@/contexts/VideoCallContext";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { ACTIVE_CALL_STATES } from "@/hooks/video/useVideoCall";
import { createDirectConversation } from "@/services/chat";
import { parseCallType } from "@/services/video-call";
import {
  useLocalSearchParams,
  useRootNavigationState,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { BackHandler, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VideoCallScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const { lastUserBlock } = useSocket();
  const params = useLocalSearchParams<{
    userId?: string | string[];
    name?: string | string[];
    direction?: string | string[];
    autoStart?: string | string[];
    callType?: string | string[];
    image?: string | string[];
    conversationId?: string | string[];
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
  const recipientImage = Array.isArray(params.image)
    ? params.image[0]
    : params.image;
  const direction = Array.isArray(params.direction)
    ? params.direction[0]
    : params.direction;
  const routeCallType = parseCallType(
    Array.isArray(params.callType) ? params.callType[0] : params.callType,
  );
  const autoStart =
    (Array.isArray(params.autoStart) ? params.autoStart[0] : params.autoStart) ===
    "1";
  const routeConversationId = useMemo(() => {
    const rawId = Array.isArray(params.conversationId)
      ? params.conversationId[0]
      : params.conversationId;
    const parsedId = rawId ? Number(rawId) : NaN;
    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }, [params.conversationId]);
  const {
    acceptedIncomingCall,
    attachCallSession,
    callState,
    callDurationSeconds,
    endCall,
    isCameraEnabled,
    isInCall,
    isMicrophoneEnabled,
    isRemoteCameraEnabled,
    localStream,
    minimizeActiveCall,
    remoteStream,
    startCall,
    startCamera,
    stopCamera,
    switchCamera,
    toggleCamera,
    toggleMicrophone,
  } = useIncomingVideoCall();
  const matchingIncomingCall =
    direction === "incoming" &&
    acceptedIncomingCall?.call.sender_id === recipientId
      ? acceptedIncomingCall
      : null;
  const callType = parseCallType(
    direction === "incoming"
      ? matchingIncomingCall?.call.call_type ?? routeCallType
      : routeCallType,
  );
  const isValidRecipient =
    Number.isInteger(recipientId) &&
    recipientId > 0 &&
    user !== null &&
    Number(user.id) !== recipientId;

  useEffect(() => {
    if (!isValidRecipient) {
      return;
    }

    attachCallSession({
      recipientId,
      name: recipientName ?? "Потребител",
      image: recipientImage ?? "",
      callType,
      direction: direction === "incoming" ? "incoming" : "outgoing",
    });
  }, [
    attachCallSession,
    callType,
    direction,
    isValidRecipient,
    recipientId,
    recipientImage,
    recipientName,
  ]);

  useEffect(() => {
    if (!lastUserBlock?.blocked || !user?.id || !Number.isInteger(recipientId)) {
      return;
    }

    const relatedIds = [
      Number(lastUserBlock.blocker_id),
      Number(lastUserBlock.blocked_id),
    ];

    if (
      relatedIds.includes(Number(user.id)) &&
      relatedIds.includes(Number(recipientId))
    ) {
      endCall();
    }
  }, [lastUserBlock, user?.id, recipientId, endCall]);

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
        return "Свързване…";
      case "calling":
        return "Звъни…";
      default:
        return "Повикване…";
    }
  }, [callState]);
  const formattedDuration = `${Math.floor(callDurationSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(callDurationSeconds % 60)
    .toString()
    .padStart(2, "0")}`;
  const localName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "Вие"
    : "Вие";
  const localImage = user
    ? ((user as { avatar?: string | null; profile_image?: string | null })
        .avatar ??
      (user as { profile_image?: string | null }).profile_image ??
      null)
    : null;
  const remoteName = recipientName ?? "Потребител";
  const remoteImage =
    recipientImage ?? matchingIncomingCall?.call.caller_avatar ?? null;

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

  const hideCallScreen = useCallback(() => {
    if (ACTIVE_CALL_STATES.includes(callState)) {
      minimizeActiveCall();
    }
    leaveVideoCallScreen();
  }, [callState, leaveVideoCallScreen, minimizeActiveCall]);

  const openChatRoom = useCallback(async () => {
    if (!token || !Number.isInteger(recipientId) || recipientId <= 0) {
      return;
    }

    try {
      let conversationId = routeConversationId;
      let chatUserId = String(recipientId);
      let chatTitle = recipientName ?? "Потребител";
      let chatImage = recipientImage ?? "";

      if (conversationId === null) {
        const conversation = await createDirectConversation(token, recipientId);
        conversationId = conversation.id;
        chatUserId =
          conversation.other_user?.id?.toString() ?? String(recipientId);
        chatTitle =
          conversation.other_user?.name ??
          conversation.title ??
          chatTitle;
        chatImage =
          conversation.other_user?.profile_image ??
          conversation.image ??
          chatImage;
      }

      if (ACTIVE_CALL_STATES.includes(callState)) {
        minimizeActiveCall();
      }

      if (hasLeftScreenRef.current || !rootNavigationState?.key) {
        return;
      }

      hasLeftScreenRef.current = true;
      router.replace({
        pathname: "/chat/[id]",
        params: {
          id: String(conversationId),
          userId: chatUserId,
          title: chatTitle,
          image: chatImage,
        },
      });
    } catch (error: unknown) {
      console.error("Чат стаята не можа да бъде отворена:", error);
    }
  }, [
    callState,
    minimizeActiveCall,
    recipientId,
    recipientImage,
    recipientName,
    rootNavigationState?.key,
    routeConversationId,
    router,
    token,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      hideCallScreen();
      return true;
    });
    return () => subscription.remove();
  }, [hideCallScreen]);

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

  useEffect(() => {
    if (
      !autoStart ||
      direction === "incoming" ||
      isAuthLoading ||
      !isValidRecipient ||
      hasStartedCallRef.current ||
      ACTIVE_CALL_STATES.includes(callState)
    ) {
      return;
    }

    hasStartedCallRef.current = true;
    attachCallSession({
      recipientId,
      name: recipientName ?? "Потребител",
      image: recipientImage ?? "",
      callType,
      direction: "outgoing",
    });
    void startCall(recipientId).catch((error: unknown) => {
      hasStartedCallRef.current = false;
      console.error("Видео обаждането не можа да стартира автоматично:", error);
    });
  }, [
    attachCallSession,
    autoStart,
    callState,
    callType,
    direction,
    isAuthLoading,
    isValidRecipient,
    recipientId,
    recipientImage,
    recipientName,
    startCall,
  ]);

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

  const showOutgoingOverlay = [
    "calling",
    "connecting",
    "busy",
    "timeout",
    "rejected",
    "failed",
    "connection_timeout",
    "cancelled",
    "ended",
  ].includes(callState);

  return (
    <SafeAreaView
      style={[
        styles.container,
        showOutgoingOverlay
          ? { backgroundColor: theme.colors.background }
          : null,
      ]}
    >
      {showOutgoingOverlay ? null : (
        <VideoCallView
          localStream={localStream}
          remoteStream={remoteStream}
          isCameraEnabled={isCameraEnabled}
          isRemoteCameraEnabled={isRemoteCameraEnabled}
          displayName={remoteName}
          avatarUrl={remoteImage}
          localName={localName}
          localAvatarUrl={localImage}
        />
      )}

      <OutgoingCall
        visible={showOutgoingOverlay}
        ringing={callState === "calling"}
        name={remoteName}
        image={remoteImage}
        status={terminalStatus}
        callType={callType}
        canCancel={callState === "calling" || callState === "connecting"}
        onCancel={handleEndCall}
      />

      {callState === "connected" ? (
        <TouchableOpacity
          accessibilityLabel="Намали обаждането"
          accessibilityRole="button"
          onPress={hideCallScreen}
          style={styles.minimizeButton}
        >
          <Ionicons name="chevron-down" size={26} color="#fff" />
        </TouchableOpacity>
      ) : null}

      {callState === "connected" ? (
        <TouchableOpacity
          accessibilityLabel="Отвори чат стаята"
          accessibilityRole="button"
          onPress={() => void openChatRoom()}
          style={styles.chatButton}
        >
          <Ionicons name="chatbubble" size={24} color="#fff" />
        </TouchableOpacity>
      ) : null}

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
          onStartCall={() => void startCall(recipientId)}
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
  minimizeButton: {
    position: "absolute",
    top: 48,
    left: 16,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    zIndex: 2,
  },
  chatButton: {
    position: "absolute",
    top: 48,
    right: 16,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    zIndex: 2,
  },
  duration: {
    position: "absolute",
    top: 56,
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
