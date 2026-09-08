import IncomingCall from "@/components/video/incoming-call";
import ActiveCallBar from "@/components/video/active-call-bar";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { ACTIVE_CALL_STATES, useVideoCall } from "@/hooks/video/useVideoCall";
import { getConversations } from "@/services/chat";
import { emitDeviceBattery, readDeviceBattery } from "@/services/device-battery";
import {
  consumePendingIncomingCallAction,
  consumeNativeIncomingCallLaunch,
  configureIncomingCallNativeSession,
  dismissIncomingCallAlert,
  parseIncomingCallData,
  parseIncomingCallUrl,
  presentIncomingCallAlert,
  rememberCallEvent,
  setIncomingCallAppForeground,
  setPendingIncomingCallAction,
  startOngoingCallNotification,
  stopOngoingCallNotification,
  subscribeNativeIncomingCallLaunch,
  subscribePendingIncomingCallAction,
  toIncomingCallPayload,
  type PendingIncomingCallAction,
} from "@/services/incoming-call";
import { registerForPushNotifications } from "@/services/notifications";
import {
  acceptCallViaHttp,
  declineCallViaHttp,
  fetchCallById,
  fetchRingingCall,
  getRealtimeHttpUrl,
} from "@/services/realtime-http";
import {
  CALL_NO_ANSWER_MS,
  type CallIceCandidate,
  type CallServerPayload,
  type CallState,
  type CallStatePayload,
  type CallType,
} from "@/services/video-call";
import { parseCallType } from "@/services/video-call";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useRootNavigationState, useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, View, type AppStateStatus } from "react-native";
import type { MediaStream } from "react-native-webrtc";

export type AcceptedIncomingCall = {
  call: CallServerPayload;
  pendingIceCandidates: CallIceCandidate[];
};

export type ActiveCallUi = {
  recipientId: number;
  name: string;
  image: string;
  callType: CallType;
  direction: "incoming" | "outgoing";
};

type VideoCallContextValue = {
  acceptedIncomingCall: AcceptedIncomingCall | null;
  clearAcceptedIncomingCall: (callId: string) => void;
  claimActiveCall: (callId: string) => boolean;
  releaseActiveCall: (callId: string) => void;
  callUi: ActiveCallUi | null;
  isCallMinimized: boolean;
  attachCallSession: (ui: ActiveCallUi) => void;
  minimizeActiveCall: () => void;
  restoreActiveCall: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isInCall: boolean;
  callState: CallState;
  callDurationSeconds: number;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  isRemoteCameraEnabled: boolean;
  startCamera: () => Promise<MediaStream>;
  stopCamera: () => void;
  startCall: (recipientId?: number) => Promise<void>;
  endCall: () => void;
  toggleMicrophone: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  isSpeakerEnabled: boolean;
  isRemoteAudioEnabled: boolean;
  toggleSpeaker: () => void;
  toggleRemoteAudio: () => void;
};

const VideoCallContext = createContext<VideoCallContextValue | undefined>(
  undefined,
);

function appStateToSocketState(
  state: AppStateStatus,
): "active" | "background" {
  return state === "active" ? "active" : "background";
}

function mergeCall(
  current: CallServerPayload | null,
  incoming: CallServerPayload,
): CallServerPayload {
  if (!current || current.call_id !== incoming.call_id) {
    return incoming;
  }

  return {
    ...current,
    ...incoming,
    description: incoming.description ?? current.description,
    caller_name: incoming.caller_name ?? current.caller_name,
    caller_avatar: incoming.caller_avatar ?? current.caller_avatar,
  };
}

export function VideoCallProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { socket, isConnected, lastUserBlock } = useSocket();
  const { token, user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallServerPayload | null>(
    null,
  );
  const [acceptedIncomingCall, setAcceptedIncomingCall] =
    useState<AcceptedIncomingCall | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [callUi, setCallUi] = useState<ActiveCallUi | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const incomingCallRef = useRef<CallServerPayload | null>(null);
  const acceptedIncomingCallRef = useRef<AcceptedIncomingCall | null>(null);
  const pendingCandidatesRef = useRef<Map<string, CallIceCandidate[]>>(
    new Map(),
  );
  const activeCallIdRef = useRef<string | null>(null);
  const pendingAcceptRef = useRef(false);
  const navigatedAcceptRef = useRef<string | null>(null);
  const incomingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const emittedAcceptRef = useRef(new Set<string>());
  const pendingCallIdRef = useRef<string | null>(null);
  const acceptingCallRef = useRef<CallServerPayload | null>(null);
  const dismissedIncomingUiRef = useRef(new Set<string>());
  const mediaCallStateRef = useRef<CallState>("idle");

  const updateIncomingCall = useCallback((call: CallServerPayload | null) => {
    incomingCallRef.current = call;
    setIncomingCall(call);
  }, []);

  const updateAcceptedIncomingCall = useCallback(
    (call: AcceptedIncomingCall | null) => {
      acceptedIncomingCallRef.current = call;
      setAcceptedIncomingCall(call);
    },
    [],
  );

  const clearIncomingTimeout = useCallback(() => {
    if (incomingTimeoutRef.current) {
      clearTimeout(incomingTimeoutRef.current);
      incomingTimeoutRef.current = null;
    }
  }, []);

  const hideIncomingUi = useCallback(async (callId?: string) => {
    await dismissIncomingCallAlert(callId);
  }, []);

  const closeIncomingScreen = useCallback(
    (callId?: string) => {
      const current = incomingCallRef.current;
      if (current) {
        acceptingCallRef.current = current;
      }

      if (callId) {
        dismissedIncomingUiRef.current.add(callId);
      } else if (current) {
        dismissedIncomingUiRef.current.add(current.call_id);
      }

      updateIncomingCall(null);
      void hideIncomingUi(callId ?? current?.call_id);
    },
    [hideIncomingUi, updateIncomingCall],
  );

  const storeCandidates = useCallback(
    (callId: string, candidate: CallIceCandidate) => {
      const candidates = pendingCandidatesRef.current.get(callId) ?? [];
      if (
        candidates.some(
          (item) =>
            item.candidate === candidate.candidate &&
            item.sdpMid === candidate.sdpMid &&
            item.sdpMLineIndex === candidate.sdpMLineIndex,
        )
      ) {
        return candidates;
      }

      const next = [...candidates, candidate];
      pendingCandidatesRef.current.set(callId, next);
      return next;
    },
    [],
  );

  const clearCallArtifacts = useCallback(
    (callId: string) => {
      pendingCandidatesRef.current.delete(callId);
      emittedAcceptRef.current.delete(callId);
      dismissedIncomingUiRef.current.delete(callId);
      if (pendingCallIdRef.current === callId) {
        pendingCallIdRef.current = null;
      }
      if (acceptingCallRef.current?.call_id === callId) {
        acceptingCallRef.current = null;
      }
      clearIncomingTimeout();
      void hideIncomingUi(callId);

      if (incomingCallRef.current?.call_id === callId) {
        updateIncomingCall(null);
        pendingAcceptRef.current = false;
        setIsAccepting(false);
      }

      if (acceptedIncomingCallRef.current?.call.call_id === callId) {
        updateAcceptedIncomingCall(null);
      }

      if (activeCallIdRef.current === callId) {
        activeCallIdRef.current = null;
      }
    },
    [
      clearIncomingTimeout,
      hideIncomingUi,
      updateAcceptedIncomingCall,
      updateIncomingCall,
    ],
  );

  const beginIncomingCall = useCallback(
    (payload: CallServerPayload) => {
      const knownCallIds = [
        incomingCallRef.current?.call_id,
        acceptedIncomingCallRef.current?.call.call_id,
        activeCallIdRef.current,
      ];

      if (
        knownCallIds.some(
          (callId) =>
            callId !== null &&
            callId !== undefined &&
            callId !== payload.call_id,
        )
      ) {
        socket?.emit("call:end", {
          call_id: payload.call_id,
          recipient_id: payload.sender_id,
          reason: "busy",
        });
        return false;
      }

      const merged = mergeCall(
        incomingCallRef.current ?? acceptingCallRef.current,
        payload,
      );

      if (
        dismissedIncomingUiRef.current.has(merged.call_id) ||
        pendingAcceptRef.current ||
        acceptedIncomingCallRef.current?.call.call_id === merged.call_id
      ) {
        acceptingCallRef.current = merged;
        if (!pendingCandidatesRef.current.has(merged.call_id)) {
          pendingCandidatesRef.current.set(merged.call_id, []);
        }
        return true;
      }

      updateIncomingCall(merged);

      if (!pendingCandidatesRef.current.has(merged.call_id)) {
        pendingCandidatesRef.current.set(merged.call_id, []);
      }

      clearIncomingTimeout();
      incomingTimeoutRef.current = setTimeout(() => {
        incomingTimeoutRef.current = null;
        if (incomingCallRef.current?.call_id === merged.call_id) {
          clearCallArtifacts(merged.call_id);
        }
      }, CALL_NO_ANSWER_MS + 2_000);

      return true;
    },
    [clearCallArtifacts, clearIncomingTimeout, socket, updateIncomingCall],
  );

  const acceptIncomingCall = useCallback(() => {
    const call = incomingCallRef.current ?? acceptingCallRef.current;
    pendingAcceptRef.current = true;
    setIsAccepting(true);
    closeIncomingScreen(call?.call_id);

    if (!call) return;

    console.log("[CALL] acceptCall started", { callId: call.call_id });

    if (!call.description || call.description.type !== "offer") {
      return;
    }

    if (acceptedIncomingCallRef.current?.call.call_id === call.call_id) {
      return;
    }

    const acceptedCall = {
      call,
      pendingIceCandidates: [
        ...(pendingCandidatesRef.current.get(call.call_id) ?? []),
      ],
    };

    if (activeCallIdRef.current && activeCallIdRef.current !== call.call_id) {
      return;
    }

    updateAcceptedIncomingCall(acceptedCall);
    acceptingCallRef.current = call;
    updateIncomingCall(null);
    setIsAccepting(false);
    clearIncomingTimeout();
    closeIncomingScreen(call.call_id);
    console.log("[CALL] local state -> connecting", {
      callId: call.call_id,
    });

    if (!navigationState?.key || isAuthLoading || !isAuthenticated) {
      return;
    }

    pendingAcceptRef.current = false;
    navigatedAcceptRef.current = call.call_id;
    console.log("[CALL] active call navigation", {
      callId: call.call_id,
    });
    router.push({
      pathname: "/video-call/[userId]",
      params: {
        userId: String(call.sender_id),
        name: call.caller_name ?? "Потребител",
        image: call.caller_avatar ?? "",
        callType: call.call_type === "audio" ? "audio" : "video",
        direction: "incoming",
      },
    });
  }, [
    clearIncomingTimeout,
    closeIncomingScreen,
    isAuthLoading,
    isAuthenticated,
    navigationState?.key,
    router,
    updateAcceptedIncomingCall,
    updateIncomingCall,
  ]);

  const applyCallState = useCallback(
    (callId: string, nextState: "accepted") => {
      if (nextState !== "accepted") {
        return;
      }
      const incoming = incomingCallRef.current;
      const accepted = acceptedIncomingCallRef.current;
      const held = acceptingCallRef.current;
      const isReceiver =
        incoming?.call_id === callId ||
        accepted?.call.call_id === callId ||
        held?.call_id === callId ||
        pendingCallIdRef.current === callId;

      if (!isReceiver) {
        return;
      }

      if (accepted?.call.call_id === callId) {
        console.log("[CALL] ignoring duplicate accepted transition", {
          callId,
        });
        return;
      }

      const callerId =
        incoming?.sender_id ?? accepted?.call.sender_id ?? held?.sender_id;
      if (callerId && !emittedAcceptRef.current.has(callId)) {
        emittedAcceptRef.current.add(callId);
        void emitDeviceBattery(socket)
          .catch(() => null)
          .then(() => {
            if (socket?.connected) {
              console.log("[CALL] emitting call:accept callId=" + callId);
              socket.emit("call:accept", {
                call_id: callId,
                recipient_id: callerId,
              });
              return;
            }
            if (!token) {
              emittedAcceptRef.current.delete(callId);
              return;
            }
            console.log("[CALL] accepting call via HTTP callId=" + callId);
            return acceptCallViaHttp(token, callId);
          })
          .catch((error: unknown) => {
            emittedAcceptRef.current.delete(callId);
            console.error("Приемането на обаждането не се изпрати:", error);
          });
      }

      pendingAcceptRef.current = true;
      setIsAccepting(true);
      console.log("[CALL] applying local state accepted callId=" + callId);
      acceptIncomingCall();
    },
    [acceptIncomingCall, socket, token],
  );

  const rejectIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;

    console.log("[CALL] declined", { callId: call.call_id });

    socket?.emit("call:end", {
      call_id: call.call_id,
      recipient_id: call.sender_id,
      reason: "rejected",
    });

    if (user?.id) {
      socket?.emit("call:end", {
        call_id: call.call_id,
        recipient_id: Number(user.id),
        reason: "rejected_elsewhere",
      });
    }

    if (token && !socket?.connected) {
      void declineCallViaHttp(token, call.call_id).catch((error: unknown) => {
        console.error("Отказът на обаждането не се изпрати:", error);
      });
    }

    clearCallArtifacts(call.call_id);
  }, [clearCallArtifacts, socket, token, user]);

  useEffect(() => {
    if (!lastUserBlock?.blocked || !user?.id) {
      return;
    }

    const relatedIds = new Set([
      Number(lastUserBlock.blocker_id),
      Number(lastUserBlock.blocked_id),
    ]);

    if (!relatedIds.has(Number(user.id))) {
      return;
    }

    const incoming = incomingCallRef.current;
    if (incoming && relatedIds.has(Number(incoming.sender_id))) {
      rejectIncomingCall();
    }

    const accepted = acceptedIncomingCallRef.current;
    if (accepted && relatedIds.has(Number(accepted.call.sender_id))) {
      socket?.emit("call:end", {
        call_id: accepted.call.call_id,
        recipient_id: accepted.call.sender_id,
        reason: "blocked",
      });
      clearCallArtifacts(accepted.call.call_id);
    }
  }, [lastUserBlock, user?.id, rejectIncomingCall, socket, clearCallArtifacts]);

  const applyPendingAction = useCallback(
    (pending: PendingIncomingCallAction | null) => {
      if (!pending) return;

      if (pending.action === "decline") {
        if (
          incomingCallRef.current?.call_id === pending.callId ||
          pending.meta.call_id
        ) {
          if (!incomingCallRef.current) {
            beginIncomingCall(toIncomingCallPayload(pending.meta));
          }
          rejectIncomingCall();
        }
        return;
      }

      if (pending.action === "accept") {
        console.log("[CALL] native action accept callId=" + pending.callId);
        pendingCallIdRef.current = pending.callId;
        pendingAcceptRef.current = true;
        setIsAccepting(true);
        acceptingCallRef.current = mergeCall(
          acceptingCallRef.current,
          toIncomingCallPayload(pending.meta),
        );
        closeIncomingScreen(pending.callId);
        socket?.emit("call:sync");
        applyCallState(pending.callId, "accepted");
        return;
      }

      if (!incomingCallRef.current) {
        beginIncomingCall(toIncomingCallPayload(pending.meta));
      }
    },
    [applyCallState, closeIncomingScreen, rejectIncomingCall, socket],
  );

  useEffect(() => {
    if (!socket) return;

    const handleOffer = (payload: CallServerPayload) => {
      if (payload.description && payload.description.type !== "offer") return;

      if (!rememberCallEvent(payload.call_id, "offer-ui")) {
        const merged = mergeCall(
          incomingCallRef.current ?? acceptingCallRef.current,
          payload,
        );
        acceptingCallRef.current = merged;
        if (
          incomingCallRef.current?.call_id === payload.call_id &&
          !dismissedIncomingUiRef.current.has(payload.call_id) &&
          !pendingAcceptRef.current
        ) {
          updateIncomingCall(merged);
        }
        if (pendingAcceptRef.current && merged.description?.type === "offer") {
          applyCallState(merged.call_id, "accepted");
        }
        return;
      }

      beginIncomingCall(payload);
      console.log("[CALL] socket delivered", { callId: payload.call_id });

      if (pendingAcceptRef.current && payload.description?.type === "offer") {
        applyCallState(payload.call_id, "accepted");
      }
    };

    const handleIceCandidate = (payload: CallServerPayload) => {
      if (!payload.candidate) return;

      const candidates = storeCandidates(payload.call_id, payload.candidate);
      const visibleCallId = incomingCallRef.current?.call_id;
      const acceptedCallId = acceptedIncomingCallRef.current?.call.call_id;

      if (
        payload.call_id !== visibleCallId &&
        payload.call_id !== acceptedCallId
      ) {
        return;
      }

      if (payload.call_id === acceptedCallId && acceptedIncomingCallRef.current) {
        updateAcceptedIncomingCall({
          call: acceptedIncomingCallRef.current.call,
          pendingIceCandidates: [...candidates],
        });
      }
    };

    const handleEnd = (payload: CallServerPayload) => {
      const isHandledElsewhere =
        payload.reason === "answered_elsewhere" ||
        payload.reason === "rejected_elsewhere";
      if (
        isHandledElsewhere &&
        (payload.call_id === activeCallIdRef.current ||
          pendingAcceptRef.current)
      ) {
        return;
      }

      void hideIncomingUi(payload.call_id);
      clearCallArtifacts(payload.call_id);
    };

    const handleCallState = (payload: CallStatePayload) => {
      if (!payload.call) {
        if (incomingCallRef.current && !acceptedIncomingCallRef.current) {
          const currentId = incomingCallRef.current.call_id;
          const stillPendingAccept = pendingAcceptRef.current;
          if (!stillPendingAccept) {
            clearCallArtifacts(currentId);
          }
        }
        return;
      }

      if (payload.pending_ice_candidates.length > 0) {
        payload.pending_ice_candidates.forEach((candidate) => {
          storeCandidates(payload.call!.call_id, candidate);
        });
      }

      handleOffer(payload.call);
      if (payload.status === "accepted" && pendingAcceptRef.current) {
        applyCallState(payload.call.call_id, "accepted");
      }
    };

    const handleAccepted = (payload: CallServerPayload) => {
      console.log("[CALL] received call:accepted callId=" + payload.call_id);
      if (!pendingAcceptRef.current) {
        return;
      }
      applyCallState(payload.call_id, "accepted");
    };

    const handleDisconnect = () => {
      // Keep ringing state so a background/killed restore can continue.
    };

    socket.on("call:offer", handleOffer);
    socket.on("call:accepted", handleAccepted);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:end", handleEnd);
    socket.on("call:state", handleCallState);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("call:offer", handleOffer);
      socket.off("call:accepted", handleAccepted);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:end", handleEnd);
      socket.off("call:state", handleCallState);
      socket.off("disconnect", handleDisconnect);
    };
  }, [
    applyCallState,
    beginIncomingCall,
    clearCallArtifacts,
    hideIncomingUi,
    socket,
    storeCandidates,
    updateAcceptedIncomingCall,
    updateIncomingCall,
  ]);

  useEffect(() => {
    if (!socket || !isConnected || !token) return;

    void configureIncomingCallNativeSession({
      token,
      socketUrl: getRealtimeHttpUrl(),
    });

    void Promise.all([
      registerForPushNotifications(token),
      readDeviceBattery().catch(() => null),
    ])
      .then(([expoPushToken, battery]) => {
        socket.emit("device:register", {
          expo_push_token: expoPushToken ?? undefined,
          app_state: appStateToSocketState(appStateRef.current),
          ...(battery ?? {}),
        });
      })
      .catch((error: unknown) => {
        console.error("Push token за обаждания не се регистрира:", error);
        socket.emit("device:register", {
          app_state: appStateToSocketState(appStateRef.current),
        });
      });
  }, [isConnected, socket, token]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    void emitDeviceBattery(socket).catch(() => {});
    const timer = setInterval(() => {
      void emitDeviceBattery(socket).catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, [isConnected, socket]);

  useEffect(() => {
    if (!incomingCall || incomingCall.caller_name || !token) {
      return;
    }

    const controller = new AbortController();
    const callId = incomingCall.call_id;
    const senderId = incomingCall.sender_id;

    void getConversations(token, controller.signal)
      .then((conversations) => {
        if (
          controller.signal.aborted ||
          incomingCallRef.current?.call_id !== callId
        ) {
          return;
        }

        const matchedCaller = conversations.find(
          (conversation) =>
            Number(conversation.other_user?.id) === senderId,
        )?.other_user;

        if (!matchedCaller) {
          return;
        }

        updateIncomingCall({
          ...incomingCallRef.current!,
          caller_name: matchedCaller.name,
          caller_avatar: matchedCaller.profile_image,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Данните за повикващия не се заредиха:", error);
      });

    return () => {
      controller.abort();
    };
  }, [incomingCall, token, updateIncomingCall]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit("app:state", {
      app_state: appStateToSocketState(appStateRef.current),
    });
    socket.emit("call:sync");

    if (!token) return;

    void fetchRingingCall(token)
      .then((result) => {
        if (!result.call) {
          if (pendingAcceptRef.current) {
            return;
          }

          const current = incomingCallRef.current;
          if (
            current &&
            !acceptedIncomingCallRef.current &&
            !current.description
          ) {
            console.log("[CALL] stale call ignored", {
              callId: current.call_id,
            });
            clearCallArtifacts(current.call_id);
          }
          return;
        }

        result.pending_ice_candidates.forEach((candidate) => {
          storeCandidates(result.call!.call_id, candidate);
        });
        beginIncomingCall(result.call);
        console.log("[CALL] call restored", {
          callId: result.call.call_id,
        });

        if (pendingAcceptRef.current) {
          applyCallState(result.call.call_id, "accepted");
        }
      })
      .catch((error: unknown) => {
        console.error("Текущото входящо обаждане не се зареди:", error);
      });
  }, [applyCallState, beginIncomingCall, clearCallArtifacts, isConnected, socket, storeCandidates, token]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      void setIncomingCallAppForeground(nextState === "active");
      socket?.emit("app:state", {
        app_state: appStateToSocketState(nextState),
      });

      if (nextState === "active") {
        void emitDeviceBattery(socket).catch(() => {});
        void consumeNativeIncomingCallLaunch()
          .then((pending) => {
            if (!pending) return;
            console.log("[CALL] launch action received", {
              action: pending.action,
              callId: pending.callId,
            });
            setPendingIncomingCallAction(pending);
            applyPendingAction(pending);
          })
          .catch(() => {});

        socket?.emit("call:sync");

        const callId =
          incomingCallRef.current?.call_id ??
          acceptedIncomingCallRef.current?.call.call_id ??
          pendingCallIdRef.current;
        console.log("[CALL] app resumed callId=" + (callId ?? "none"));

        if (!callId) {
          console.log("[CALL] reconciliation skipped: no active call");
        } else if (token && !ACTIVE_CALL_STATES.includes(mediaCallStateRef.current)) {
          console.log("[CALL] reconciling call state callId=" + callId);
          void fetchCallById(token, callId)
            .then((result) => {
              if (result.status === "accepted" || result.status === "active") {
                console.log("[CALL] server state returned accepted");
                if (result.call) {
                  result.pending_ice_candidates.forEach((candidate) => {
                    storeCandidates(result.call!.call_id, candidate);
                  });
                  beginIncomingCall(result.call);
                }
                if (pendingAcceptRef.current) {
                  applyCallState(callId, "accepted");
                }
                return;
              }

              const localIsIncoming =
                incomingCallRef.current?.call_id === callId &&
                !acceptedIncomingCallRef.current;
              if (
                localIsIncoming &&
                (result.status === "declined" ||
                  result.status === "ended" ||
                  result.status === "cancelled" ||
                  result.status === "timeout" ||
                  result.status === "idle")
              ) {
                console.log("[CALL] state mismatch callId=" + callId, {
                  local: "incoming",
                  server: result.status,
                });
                clearCallArtifacts(callId);
              }
            })
            .catch((error: unknown) => {
              console.error("Състоянието на обаждането не се свери:", error);
            });
        }

        if (incomingCallRef.current) {
          void hideIncomingUi(incomingCallRef.current.call_id);
        }
        return;
      }

      const call = incomingCallRef.current;
      if (!call) return;

      void presentIncomingCallAlert({
        callId: call.call_id,
        callerId: call.sender_id,
        callerName: call.caller_name,
        callerAvatar: call.caller_avatar,
        callType: call.call_type,
      });
    });

    return () => {
      subscription.remove();
    };
  }, [
    applyCallState,
    applyPendingAction,
    beginIncomingCall,
    clearCallArtifacts,
    hideIncomingUi,
    socket,
    storeCandidates,
    token,
  ]);

  useEffect(() => {
    const call = incomingCall;
    if (!call || pendingAcceptRef.current || dismissedIncomingUiRef.current.has(call.call_id)) {
      return;
    }

    if (appStateRef.current !== "active") {
      void presentIncomingCallAlert({
        callId: call.call_id,
        callerId: call.sender_id,
        callerName: call.caller_name,
        callerAvatar: call.caller_avatar,
        callType: call.call_type,
      });
      return;
    }

    void hideIncomingUi(call.call_id);
  }, [hideIncomingUi, incomingCall]);

  useEffect(() => {
    void setIncomingCallAppForeground(AppState.currentState === "active");

    const handleUrl = (url: string | null) => {
      const pending = parseIncomingCallUrl(url);
      if (!pending) return;
      setPendingIncomingCallAction(pending);
      applyPendingAction(pending);
    };

    const linkingSubscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    void Linking.getInitialURL().then(handleUrl);

    void consumeNativeIncomingCallLaunch()
      .then((pending) => {
        if (!pending) return;
        console.log("[CALL] launch action received", {
          callId: pending.callId,
          action: pending.action,
        });
        setPendingIncomingCallAction(pending);
        applyPendingAction(pending);
      })
      .catch((error: unknown) => {
        console.error("Native incoming call launch не се прочете:", error);
      });

    const unsubscribeNativeLaunch = subscribeNativeIncomingCallLaunch(
      (pending) => {
        console.log("[CALL] launch action received", {
          callId: pending.callId,
          action: pending.action,
        });
        setPendingIncomingCallAction(pending);
        applyPendingAction(pending);
      },
    );

    const notificationSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        const payload = parseIncomingCallData(
          notification.request.content.data as Record<string, unknown>,
        );
        if (!payload) return;

        if (payload.type === "incoming_call_ended") {
          if (
            pendingAcceptRef.current &&
            (incomingCallRef.current?.call_id === payload.call_id ||
              acceptedIncomingCallRef.current?.call.call_id === payload.call_id)
          ) {
            return;
          }
          clearCallArtifacts(payload.call_id);
          return;
        }

        beginIncomingCall(toIncomingCallPayload(payload));
      });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const payload = parseIncomingCallData(
          response.notification.request.content.data as Record<string, unknown>,
        );
        if (!payload || payload.type !== "incoming_call") return;

        const action: PendingIncomingCallAction["action"] =
          response.actionIdentifier === "incoming_call_accept"
            ? "accept"
            : response.actionIdentifier === "incoming_call_decline"
              ? "decline"
              : "open";

        const pending = {
          callId: payload.call_id,
          action,
          meta: payload,
        };
        setPendingIncomingCallAction(pending);
        applyPendingAction(pending);
      });

    const unsubscribePending = subscribePendingIncomingCallAction((pending) => {
      if (pending) applyPendingAction(pending);
    });

    const existingPending = consumePendingIncomingCallAction();
    if (existingPending) {
      queueMicrotask(() => applyPendingAction(existingPending));
    }

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;

        const payload = parseIncomingCallData(
          response.notification.request.content.data as Record<string, unknown>,
        );
        if (!payload || payload.type !== "incoming_call") return;

        const action: PendingIncomingCallAction["action"] =
          response.actionIdentifier === "incoming_call_accept"
            ? "accept"
            : response.actionIdentifier === "incoming_call_decline"
              ? "decline"
              : "open";

        applyPendingAction({
          callId: payload.call_id,
          action,
          meta: payload,
        });
      })
      .catch((error: unknown) => {
        console.error("Последното входящо обаждане не се прочете:", error);
      });

    return () => {
      linkingSubscription.remove();
      notificationSubscription.remove();
      responseSubscription.remove();
      unsubscribeNativeLaunch();
      unsubscribePending();
    };
  }, [applyPendingAction, beginIncomingCall, clearCallArtifacts]);

  useEffect(() => {
    if (
      !pendingAcceptRef.current ||
      !incomingCall?.description ||
      incomingCall.description.type !== "offer" ||
      !navigationState?.key ||
      isAuthLoading ||
      !isAuthenticated
    ) {
      return;
    }

    acceptIncomingCall();
  }, [
    acceptIncomingCall,
    incomingCall,
    isAuthLoading,
    isAuthenticated,
    navigationState?.key,
  ]);

  useEffect(() => {
    if (!isAccepting || !token) {
      return;
    }

    const callId =
      pendingCallIdRef.current ??
      acceptingCallRef.current?.call_id ??
      incomingCallRef.current?.call_id;
    if (!callId) {
      return;
    }

    if (
      acceptingCallRef.current?.description?.type === "offer" ||
      incomingCallRef.current?.description?.type === "offer"
    ) {
      applyCallState(callId, "accepted");
      return;
    }

    console.log("[CALL] reconciling call state callId=" + callId);
    void fetchCallById(token, callId)
      .then((result) => {
        if (!pendingAcceptRef.current) {
          return;
        }

        console.log("[CALL] server state returned " + result.status);
        result.pending_ice_candidates.forEach((candidate) => {
          if (result.call) {
            storeCandidates(result.call.call_id, candidate);
          }
        });
        if (result.call) {
          beginIncomingCall(result.call);
          applyCallState(result.call.call_id, "accepted");
        }
      })
      .catch((error: unknown) => {
        console.error("Текущото входящо обаждане не се зареди:", error);
      });
  }, [applyCallState, beginIncomingCall, isAccepting, storeCandidates, token]);

  useEffect(() => {
    const accepted = acceptedIncomingCall;
    if (
      !accepted ||
      !navigationState?.key ||
      isAuthLoading ||
      !isAuthenticated
    ) {
      return;
    }

    if (navigatedAcceptRef.current === accepted.call.call_id) {
      return;
    }

    navigatedAcceptRef.current = accepted.call.call_id;
    pendingAcceptRef.current = false;
    setCallUi({
      recipientId: accepted.call.sender_id,
      name: accepted.call.caller_name ?? "Потребител",
      image: accepted.call.caller_avatar ?? "",
      callType: parseCallType(accepted.call.call_type),
      direction: "incoming",
    });
    setIsCallMinimized(false);
    console.log("[CALL] active call navigation", {
      callId: accepted.call.call_id,
    });
    router.push({
      pathname: "/video-call/[userId]",
      params: {
        userId: String(accepted.call.sender_id),
        name: accepted.call.caller_name ?? "Потребител",
        image: accepted.call.caller_avatar ?? "",
        callType: accepted.call.call_type === "audio" ? "audio" : "video",
        direction: "incoming",
      },
    });
  }, [
    acceptedIncomingCall,
    isAuthLoading,
    isAuthenticated,
    navigationState?.key,
    router,
  ]);

  const clearAcceptedIncomingCall = useCallback(
    (callId: string) => {
      if (acceptedIncomingCallRef.current?.call.call_id !== callId) return;
      pendingCandidatesRef.current.delete(callId);
      updateAcceptedIncomingCall(null);
    },
    [updateAcceptedIncomingCall],
  );

  const claimActiveCall = useCallback((callId: string) => {
    if (
      activeCallIdRef.current !== null &&
      activeCallIdRef.current !== callId
    ) {
      return false;
    }
    activeCallIdRef.current = callId;
    return true;
  }, []);

  const releaseActiveCall = useCallback((callId: string) => {
    if (activeCallIdRef.current === callId) {
      activeCallIdRef.current = null;
    }
  }, []);

  const mediaCall = useVideoCall({
    recipientId: callUi?.recipientId ?? 0,
    currentUserId: user ? Number(user.id) : undefined,
    accessToken: token,
    callType: callUi?.callType ?? "video",
    acceptedIncomingCall: acceptedIncomingCall?.call ?? null,
    pendingIncomingIceCandidates: acceptedIncomingCall?.pendingIceCandidates ?? [],
    onIncomingCallAccepted: clearAcceptedIncomingCall,
    claimActiveCall,
    releaseActiveCall,
  });

  mediaCallStateRef.current = mediaCall.callState;

  const attachCallSession = useCallback((ui: ActiveCallUi) => {
    setCallUi(ui);
    setIsCallMinimized(false);
  }, []);

  const restoreActiveCall = useCallback(() => {
    if (!callUi) {
      return;
    }
    setIsCallMinimized(false);
    router.push({
      pathname: "/video-call/[userId]",
      params: {
        userId: String(callUi.recipientId),
        name: callUi.name,
        image: callUi.image,
        callType: callUi.callType,
        direction: callUi.direction,
      },
    });
  }, [callUi, router]);

  const minimizeActiveCall = useCallback(() => {
    if (!ACTIVE_CALL_STATES.includes(mediaCall.callState)) {
      return;
    }
    setIsCallMinimized(true);
  }, [mediaCall.callState]);

  useEffect(() => {
    if (!ACTIVE_CALL_STATES.includes(mediaCall.callState) || !callUi) {
      void stopOngoingCallNotification();
      return;
    }

    void startOngoingCallNotification({
      callId: acceptedIncomingCall?.call.call_id ?? `active-${callUi.recipientId}`,
      callerId: callUi.recipientId,
      callerName: callUi.name,
      callType: callUi.callType,
    });

    return () => {
      void stopOngoingCallNotification();
    };
  }, [
    acceptedIncomingCall?.call.call_id,
    callUi,
    mediaCall.callState,
  ]);

  useEffect(() => {
    if (mediaCall.callState === "idle") {
      setIsCallMinimized(false);
    }
  }, [mediaCall.callState]);

  const value = useMemo(
    () => ({
      acceptedIncomingCall,
      clearAcceptedIncomingCall,
      claimActiveCall,
      releaseActiveCall,
      callUi,
      isCallMinimized,
      attachCallSession,
      minimizeActiveCall,
      restoreActiveCall,
      localStream: mediaCall.localStream,
      remoteStream: mediaCall.remoteStream,
      isInCall: mediaCall.isInCall,
      callState: mediaCall.callState,
      callDurationSeconds: mediaCall.callDurationSeconds,
      isMicrophoneEnabled: mediaCall.isMicrophoneEnabled,
      isCameraEnabled: mediaCall.isCameraEnabled,
      isRemoteCameraEnabled: mediaCall.isRemoteCameraEnabled,
      isSpeakerEnabled: mediaCall.isSpeakerEnabled,
      isRemoteAudioEnabled: mediaCall.isRemoteAudioEnabled,
      startCamera: mediaCall.startCamera,
      stopCamera: mediaCall.stopCamera,
      startCall: mediaCall.startCall,
      endCall: mediaCall.endCall,
      toggleMicrophone: mediaCall.toggleMicrophone,
      toggleCamera: mediaCall.toggleCamera,
      switchCamera: mediaCall.switchCamera,
      toggleSpeaker: mediaCall.toggleSpeaker,
      toggleRemoteAudio: mediaCall.toggleRemoteAudio,
    }),
    [
      acceptedIncomingCall,
      attachCallSession,
      claimActiveCall,
      clearAcceptedIncomingCall,
      callUi,
      isCallMinimized,
      mediaCall.callDurationSeconds,
      mediaCall.callState,
      mediaCall.endCall,
      mediaCall.isCameraEnabled,
      mediaCall.isInCall,
      mediaCall.isMicrophoneEnabled,
      mediaCall.isRemoteAudioEnabled,
      mediaCall.isRemoteCameraEnabled,
      mediaCall.isSpeakerEnabled,
      mediaCall.localStream,
      mediaCall.remoteStream,
      mediaCall.startCall,
      mediaCall.startCamera,
      mediaCall.stopCamera,
      mediaCall.switchCamera,
      mediaCall.toggleCamera,
      mediaCall.toggleMicrophone,
      mediaCall.toggleRemoteAudio,
      mediaCall.toggleSpeaker,
      minimizeActiveCall,
      releaseActiveCall,
      restoreActiveCall,
    ],
  );

  const showActiveCallBar =
    isCallMinimized && ACTIVE_CALL_STATES.includes(mediaCall.callState) && callUi !== null;

  return (
    <VideoCallContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        <IncomingCall
          visible={incomingCall !== null}
          connecting={false}
          callerName={incomingCall?.caller_name}
          callerImage={incomingCall?.caller_avatar}
          callType={incomingCall?.call_type === "audio" ? "audio" : "video"}
          onAccept={() => {
            if (incomingCall) {
              applyCallState(incomingCall.call_id, "accepted");
            }
          }}
          onReject={rejectIncomingCall}
        />
        <ActiveCallBar
          visible={showActiveCallBar}
          name={callUi?.name ?? "Обаждане"}
          image={callUi?.image}
          durationSeconds={mediaCall.callDurationSeconds}
          connected={mediaCall.callState === "connected"}
          onPress={restoreActiveCall}
          onEndCall={mediaCall.endCall}
        />
      </View>
    </VideoCallContext.Provider>
  );
}

export function useIncomingVideoCall() {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error(
      "useIncomingVideoCall трябва да се използва във VideoCallProvider.",
    );
  }
  return context;
}
