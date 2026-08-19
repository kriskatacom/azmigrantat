import IncomingCall from "@/components/video/incoming-call";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { getConversations } from "@/services/chat";
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
  subscribeNativeIncomingCallLaunch,
  subscribePendingIncomingCallAction,
  toIncomingCallPayload,
  type PendingIncomingCallAction,
} from "@/services/incoming-call";
import { registerForPushNotifications } from "@/services/notifications";
import { declineCallViaHttp, fetchRingingCall, getRealtimeHttpUrl } from "@/services/realtime-http";
import {
  CALL_NO_ANSWER_MS,
  type CallIceCandidate,
  type CallServerPayload,
  type CallStatePayload,
} from "@/services/video-call";
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

export type AcceptedIncomingCall = {
  call: CallServerPayload;
  pendingIceCandidates: CallIceCandidate[];
};

type VideoCallContextValue = {
  acceptedIncomingCall: AcceptedIncomingCall | null;
  clearAcceptedIncomingCall: (callId: string) => void;
  claimActiveCall: (callId: string) => boolean;
  releaseActiveCall: (callId: string) => void;
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
  const { socket, isConnected } = useSocket();
  const { token, user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallServerPayload | null>(
    null,
  );
  const [acceptedIncomingCall, setAcceptedIncomingCall] =
    useState<AcceptedIncomingCall | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const incomingCallRef = useRef<CallServerPayload | null>(null);
  const acceptedIncomingCallRef = useRef<AcceptedIncomingCall | null>(null);
  const pendingCandidatesRef = useRef<Map<string, CallIceCandidate[]>>(
    new Map(),
  );
  const activeCallIdRef = useRef<string | null>(null);
  const pendingAcceptRef = useRef(false);
  const incomingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

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

      const merged = mergeCall(incomingCallRef.current, payload);
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
    const call = incomingCallRef.current;
    if (!call) return;

    pendingAcceptRef.current = true;
    setIsAccepting(true);
    console.log("[CALL] accepted", { callId: call.call_id });

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
    updateIncomingCall(null);
    setIsAccepting(false);
    pendingAcceptRef.current = false;
    clearIncomingTimeout();
    void hideIncomingUi(call.call_id);

    if (!navigationState?.key || isAuthLoading || !isAuthenticated) {
      return;
    }

    router.push({
      pathname: "/video-call/[userId]",
      params: {
        userId: String(call.sender_id),
        name: call.caller_name ?? "Потребител",
        direction: "incoming",
      },
    });
  }, [
    clearIncomingTimeout,
    hideIncomingUi,
    isAuthLoading,
    isAuthenticated,
    navigationState?.key,
    router,
    updateAcceptedIncomingCall,
    updateIncomingCall,
  ]);

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
        pendingAcceptRef.current = true;
        setIsAccepting(true);

        if (!incomingCallRef.current) {
          beginIncomingCall(toIncomingCallPayload(pending.meta));
        }

        if (incomingCallRef.current?.description?.type === "offer") {
          acceptIncomingCall();
        }
        return;
      }

      if (!incomingCallRef.current) {
        beginIncomingCall(toIncomingCallPayload(pending.meta));
      }
    },
    [acceptIncomingCall, beginIncomingCall, rejectIncomingCall],
  );

  useEffect(() => {
    if (!socket) return;

    const handleOffer = (payload: CallServerPayload) => {
      if (payload.description && payload.description.type !== "offer") return;

      if (!rememberCallEvent(payload.call_id, "offer-ui")) {
        const merged = mergeCall(incomingCallRef.current, payload);
        if (incomingCallRef.current?.call_id === payload.call_id) {
          updateIncomingCall(merged);
        }
        if (pendingAcceptRef.current && merged.description?.type === "offer") {
          acceptIncomingCall();
        }
        return;
      }

      beginIncomingCall(payload);
      console.log("[CALL] socket delivered", { callId: payload.call_id });

      if (pendingAcceptRef.current && payload.description?.type === "offer") {
        acceptIncomingCall();
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
    };

    const handleDisconnect = () => {
      // Keep ringing state so a background/killed restore can continue.
    };

    socket.on("call:offer", handleOffer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:end", handleEnd);
    socket.on("call:state", handleCallState);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("call:offer", handleOffer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:end", handleEnd);
      socket.off("call:state", handleCallState);
      socket.off("disconnect", handleDisconnect);
    };
  }, [
    acceptIncomingCall,
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

    void registerForPushNotifications(token)
      .then((expoPushToken) => {
        socket.emit("device:register", {
          expo_push_token: expoPushToken ?? undefined,
          app_state: appStateToSocketState(appStateRef.current),
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

        if (pendingAcceptRef.current && result.call.description?.type === "offer") {
          acceptIncomingCall();
        }
      })
      .catch((error: unknown) => {
        console.error("Текущото входящо обаждане не се зареди:", error);
      });
  }, [acceptIncomingCall, beginIncomingCall, clearCallArtifacts, isConnected, socket, storeCandidates, token]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      void setIncomingCallAppForeground(nextState === "active");
      socket?.emit("app:state", {
        app_state: appStateToSocketState(nextState),
      });

      const call = incomingCallRef.current;
      if (!call) return;

      if (nextState === "active") {
        void hideIncomingUi(call.call_id);
        return;
      }

      void presentIncomingCallAlert({
        callId: call.call_id,
        callerId: call.sender_id,
        callerName: call.caller_name,
        callerAvatar: call.caller_avatar,
      });
    });

    return () => {
      subscription.remove();
    };
  }, [hideIncomingUi, socket]);

  useEffect(() => {
    const call = incomingCall;
    if (!call) {
      return;
    }

    if (appStateRef.current !== "active") {
      void presentIncomingCallAlert({
        callId: call.call_id,
        callerId: call.sender_id,
        callerName: call.caller_name,
        callerAvatar: call.caller_avatar,
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
        console.log("[CALL] RN ready", {
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
        console.log("[CALL] native launch event", {
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

  const value = useMemo(
    () => ({
      acceptedIncomingCall,
      clearAcceptedIncomingCall,
      claimActiveCall,
      releaseActiveCall,
    }),
    [
      acceptedIncomingCall,
      claimActiveCall,
      clearAcceptedIncomingCall,
      releaseActiveCall,
    ],
  );

  return (
    <VideoCallContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        <IncomingCall
          visible={incomingCall !== null}
          connecting={isAccepting && incomingCall?.description?.type !== "offer"}
          callerName={incomingCall?.caller_name}
          callerImage={incomingCall?.caller_avatar}
          onAccept={acceptIncomingCall}
          onReject={rejectIncomingCall}
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
