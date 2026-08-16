import IncomingCall from "@/components/video/incoming-call";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { getConversations } from "@/services/chat";
import type {
  CallIceCandidate,
  CallServerPayload,
} from "@/services/video-call";
import type { ChatUser } from "@/types/chat";
import { useRouter } from "expo-router";
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

export type AcceptedIncomingCall = {
  call: CallServerPayload;
  pendingIceCandidates: CallIceCandidate[];
};

type VideoCallContextValue = {
  acceptedIncomingCall: AcceptedIncomingCall | null;
  clearAcceptedIncomingCall: (callId: string) => void;
};

const VideoCallContext = createContext<VideoCallContextValue | undefined>(
  undefined,
);

export function VideoCallProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { socket } = useSocket();
  const { token } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallServerPayload | null>(
    null,
  );
  const [acceptedIncomingCall, setAcceptedIncomingCall] =
    useState<AcceptedIncomingCall | null>(null);
  const [caller, setCaller] = useState<ChatUser | null>(null);
  const incomingCallRef = useRef<CallServerPayload | null>(null);
  const acceptedIncomingCallRef = useRef<AcceptedIncomingCall | null>(null);
  const pendingCandidatesRef = useRef<Map<string, CallIceCandidate[]>>(
    new Map(),
  );
  const callerRequestRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    if (!socket) return;

    const handleOffer = (payload: CallServerPayload) => {
      if (payload.description?.type !== "offer") return;

      pendingCandidatesRef.current.set(payload.call_id, []);
      callerRequestRef.current?.abort();
      setCaller(null);
      updateIncomingCall(payload);

      if (token) {
        const controller = new AbortController();
        callerRequestRef.current = controller;
        void getConversations(token, controller.signal)
          .then((conversations) => {
            if (
              controller.signal.aborted ||
              incomingCallRef.current?.call_id !== payload.call_id
            ) {
              return;
            }
            const matchedCaller = conversations.find(
              (conversation) =>
                Number(conversation.other_user?.id) === payload.sender_id,
            )?.other_user;
            setCaller(matchedCaller ?? null);
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) return;
            console.error("Данните за повикващия не се заредиха:", error);
          });
      }
    };

    const handleIceCandidate = (payload: CallServerPayload) => {
      if (!payload.candidate) return;

      const visibleCallId = incomingCallRef.current?.call_id;
      const acceptedCallId = acceptedIncomingCallRef.current?.call.call_id;
      if (
        payload.call_id !== visibleCallId &&
        payload.call_id !== acceptedCallId
      ) {
        return;
      }

      const candidates = pendingCandidatesRef.current.get(payload.call_id) ?? [];
      candidates.push(payload.candidate);
      pendingCandidatesRef.current.set(payload.call_id, candidates);

      if (payload.call_id === acceptedCallId) {
        updateAcceptedIncomingCall({
          call: acceptedIncomingCallRef.current!.call,
          pendingIceCandidates: [...candidates],
        });
      }
    };

    const handleEnd = (payload: CallServerPayload) => {
      if (payload.call_id === incomingCallRef.current?.call_id) {
        updateIncomingCall(null);
        setCaller(null);
      }
      if (payload.call_id === acceptedIncomingCallRef.current?.call.call_id) {
        updateAcceptedIncomingCall(null);
      }
      pendingCandidatesRef.current.delete(payload.call_id);
    };

    socket.on("call:offer", handleOffer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:end", handleEnd);

    return () => {
      callerRequestRef.current?.abort();
      socket.off("call:offer", handleOffer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:end", handleEnd);
    };
  }, [socket, token, updateAcceptedIncomingCall, updateIncomingCall]);

  const acceptIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;

    const acceptedCall = {
      call,
      pendingIceCandidates: [
        ...(pendingCandidatesRef.current.get(call.call_id) ?? []),
      ],
    };
    updateAcceptedIncomingCall(acceptedCall);
    updateIncomingCall(null);
    setCaller(null);

    router.push({
      pathname: "/video-call/[userId]",
      params: { userId: String(call.sender_id), direction: "incoming" },
    });
  }, [router, updateAcceptedIncomingCall, updateIncomingCall]);

  const rejectIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;

    socket?.emit("call:end", {
      call_id: call.call_id,
      recipient_id: call.sender_id,
      reason: "rejected",
    });
    pendingCandidatesRef.current.delete(call.call_id);
    updateIncomingCall(null);
    setCaller(null);
  }, [socket, updateIncomingCall]);

  const clearAcceptedIncomingCall = useCallback(
    (callId: string) => {
      if (acceptedIncomingCallRef.current?.call.call_id !== callId) return;
      pendingCandidatesRef.current.delete(callId);
      updateAcceptedIncomingCall(null);
    },
    [updateAcceptedIncomingCall],
  );

  const value = useMemo(
    () => ({ acceptedIncomingCall, clearAcceptedIncomingCall }),
    [acceptedIncomingCall, clearAcceptedIncomingCall],
  );

  return (
    <VideoCallContext.Provider value={value}>
      {children}
      <IncomingCall
        visible={incomingCall !== null}
        callerName={caller?.name}
        callerImage={caller?.profile_image}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />
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
