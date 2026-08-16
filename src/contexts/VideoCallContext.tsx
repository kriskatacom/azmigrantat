import IncomingCall from "@/components/video/incoming-call";
import { useSocket } from "@/hooks/useSocket";
import type {
  CallIceCandidate,
  CallServerPayload,
} from "@/services/video-call";
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
  const [incomingCall, setIncomingCall] = useState<CallServerPayload | null>(
    null,
  );
  const [acceptedIncomingCall, setAcceptedIncomingCall] =
    useState<AcceptedIncomingCall | null>(null);
  const incomingCallRef = useRef<CallServerPayload | null>(null);
  const acceptedIncomingCallRef = useRef<AcceptedIncomingCall | null>(null);
  const pendingCandidatesRef = useRef<Map<string, CallIceCandidate[]>>(
    new Map(),
  );

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
      updateIncomingCall(payload);
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
      socket.off("call:offer", handleOffer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:end", handleEnd);
    };
  }, [socket, updateAcceptedIncomingCall, updateIncomingCall]);

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
