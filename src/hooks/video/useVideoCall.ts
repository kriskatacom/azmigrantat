import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  type MediaStream,
  type MediaStreamTrack,
} from "react-native-webrtc";

import { useLocalMedia } from "@/hooks/video/useLocalMedia";
import { getSocket } from "@/services/socket";
import type {
  CallEndReason,
  CallIceCandidate,
  CallServerPayload,
  CallState,
} from "@/services/video-call";

export type { CallState } from "@/services/video-call";

type Options = {
  recipientId: number;
  currentUserId?: number;
  acceptedIncomingCall?: CallServerPayload | null;
  pendingIncomingIceCandidates?: CallIceCandidate[];
  onIncomingCallAccepted?: (callId: string) => void;
  claimActiveCall?: (callId: string) => boolean;
  releaseActiveCall?: (callId: string) => void;
};
type SwitchableTrack = MediaStreamTrack & { _switchCamera?: () => void };
type IceEvent = {
  candidate: {
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
  } | null;
};

function isPeerOpen(peer: RTCPeerConnection | null): peer is RTCPeerConnection {
  return (
    peer !== null &&
    peer.connectionState !== "closed" &&
    peer.signalingState !== "closed"
  );
}

function isPeerShutdownError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /session was shut down|peer connection is closed/i.test(message);
}

const PEER_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
const NO_ANSWER_MS = 30_000;
const CONNECTION_MS = 15_000;
const RESET_MS = 2_000;
const ACTIVE_STATES: CallState[] = [
  "calling",
  "ringing",
  "connecting",
  "connected",
];
const TERMINAL_STATES: CallState[] = [
  "rejected",
  "busy",
  "timeout",
  "cancelled",
  "ended",
  "failed",
  "connection_timeout",
];

function candidateKey(value: CallIceCandidate) {
  return `${value.candidate}:${value.sdpMid ?? ""}:${value.sdpMLineIndex ?? ""}`;
}

function stateForReason(reason?: CallEndReason): CallState {
  if (
    reason === "rejected" ||
    reason === "busy" ||
    reason === "timeout" ||
    reason === "cancelled" ||
    reason === "failed" ||
    reason === "connection_timeout"
  ) {
    return reason;
  }
  return "ended";
}

export function useVideoCall({
  recipientId,
  currentUserId,
  acceptedIncomingCall,
  pendingIncomingIceCandidates = [],
  onIncomingCallAccepted,
  claimActiveCall,
  releaseActiveCall,
}: Options) {
  const { localStream, startCamera, stopCamera } = useLocalMedia();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallServerPayload | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const targetIdRef = useRef<number | null>(null);
  const incomingRef = useRef<CallServerPayload | null>(null);
  const stateRef = useRef<CallState>("idle");
  const remoteSetRef = useRef(false);
  const candidatesRef = useRef<RTCIceCandidate[]>([]);
  const candidateKeysRef = useRef(new Set<string>());
  const startingRef = useRef(false);
  const acceptingRef = useRef(false);
  const acceptedIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const noAnswerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const changeState = useCallback((value: CallState) => {
    stateRef.current = value;
    if (mountedRef.current) setCallState(value);
  }, []);
  const changeIncoming = useCallback((value: CallServerPayload | null) => {
    incomingRef.current = value;
    if (mountedRef.current) setIncomingCall(value);
  }, []);
  const clearNoAnswer = useCallback(() => {
    if (noAnswerRef.current) clearTimeout(noAnswerRef.current);
    noAnswerRef.current = null;
  }, []);
  const clearConnection = useCallback(() => {
    if (connectionRef.current) clearTimeout(connectionRef.current);
    connectionRef.current = null;
  }, []);
  const clearReset = useCallback(() => {
    if (resetRef.current) clearTimeout(resetRef.current);
    resetRef.current = null;
  }, []);
  const clearDuration = useCallback(() => {
    if (durationRef.current) clearInterval(durationRef.current);
    durationRef.current = null;
  }, []);
  const clearTimers = useCallback(() => {
    clearNoAnswer();
    clearConnection();
    clearReset();
    clearDuration();
  }, [clearConnection, clearDuration, clearNoAnswer, clearReset]);

  const cleanup = useCallback(
    (expectedId?: string) => {
      const currentId = callIdRef.current;
      if (expectedId && currentId && currentId !== expectedId) return false;
      clearTimers();
      const peer = peerRef.current;
      peerRef.current = null;
      peer?.close();
      stopCamera();
      remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
      if (currentId) releaseActiveCall?.(currentId);
      callIdRef.current = null;
      targetIdRef.current = null;
      remoteSetRef.current = false;
      candidatesRef.current = [];
      candidateKeysRef.current.clear();
      startingRef.current = false;
      acceptingRef.current = false;
      acceptedIdRef.current = null;
      changeIncoming(null);
      if (mountedRef.current) {
        setRemoteStream(null);
        setCallDurationSeconds(0);
        setIsMicrophoneEnabled(true);
        setIsCameraEnabled(true);
      }
      return true;
    },
    [changeIncoming, clearTimers, releaseActiveCall, stopCamera],
  );

  const finish = useCallback(
    (callId: string, state: CallState) => {
      if (callIdRef.current !== callId) return false;
      const generation = generationRef.current;
      cleanup(callId);
      changeState(state);
      resetRef.current = setTimeout(() => {
        resetRef.current = null;
        if (
          mountedRef.current &&
          generationRef.current === generation &&
          callIdRef.current === null &&
          TERMINAL_STATES.includes(stateRef.current)
        ) {
          changeState("idle");
        }
      }, RESET_MS);
      return true;
    },
    [changeState, cleanup],
  );

  const emitEnd = useCallback(
    (callId: string, targetId: number, reason: CallEndReason) => {
      getSocket()?.emit("call:end", {
        call_id: callId,
        recipient_id: targetId,
        reason,
      });
    },
    [],
  );

  const startConnectionTimeout = useCallback(
    (callId: string, targetId: number) => {
      clearConnection();
      connectionRef.current = setTimeout(() => {
        connectionRef.current = null;
        if (callIdRef.current !== callId || stateRef.current !== "connecting") return;
        emitEnd(callId, targetId, "connection_timeout");
        finish(callId, "connection_timeout");
      }, CONNECTION_MS);
    },
    [clearConnection, emitEnd, finish],
  );

  const flushCandidates = useCallback(async () => {
    const peer = peerRef.current;
    if (!isPeerOpen(peer) || !remoteSetRef.current) return;
    const candidates = candidatesRef.current;
    candidatesRef.current = [];
    for (const candidate of candidates) {
      if (!isPeerOpen(peerRef.current) || peerRef.current !== peer) return;
      try {
        await peer.addIceCandidate(candidate);
      } catch (error) {
        if (isPeerShutdownError(error)) return;
        if (isPeerOpen(peer)) {
          console.warn("[CALL] skipped ICE candidate", error);
        }
      }
    }
  }, []);

  const createPeer = useCallback(
    async (targetId: number, callId: string, preserveCandidates = false) => {
      if (callIdRef.current !== callId) throw new Error("Разговорът вече не е активен.");
      peerRef.current?.close();
      remoteSetRef.current = false;
      if (!preserveCandidates) {
        candidatesRef.current = [];
        candidateKeysRef.current.clear();
      }
      if (mountedRef.current) setRemoteStream(null);
      const peer = new RTCPeerConnection(PEER_CONFIG);
      peerRef.current = peer;
      targetIdRef.current = targetId;
      const stream = await startCamera();
      if (!mountedRef.current || callIdRef.current !== callId || peerRef.current !== peer) {
        stream.getTracks().forEach((track) => track.stop());
        peer.close();
        throw new Error("Разговорът беше прекратен.");
      }
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.ontrack = (event: { streams?: MediaStream[] }) => {
        if (peerRef.current !== peer || callIdRef.current !== callId) return;
        const streamValue = event.streams?.[0];
        if (!streamValue) return;
        remoteStreamRef.current = streamValue;
        setRemoteStream((current) => current?.id === streamValue.id ? current : streamValue);
      };
      peer.onicecandidate = (event: IceEvent) => {
        if (!event.candidate || callIdRef.current !== callId) return;
        getSocket()?.emit("call:ice-candidate", {
          call_id: callId,
          recipient_id: targetId,
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
        });
      };
      peer.onconnectionstatechange = () => {
        if (peerRef.current !== peer || callIdRef.current !== callId) return;
        if (peer.connectionState === "connected") {
          clearConnection();
          clearNoAnswer();
          changeState("connected");
          setCallDurationSeconds(0);
          clearDuration();
          durationRef.current = setInterval(() => {
            if (callIdRef.current === callId && stateRef.current === "connected") {
              setCallDurationSeconds((value) => value + 1);
            }
          }, 1_000);
        } else if (peer.connectionState === "failed") {
          emitEnd(callId, targetId, "failed");
          finish(callId, "failed");
        }
      };
      return peer;
    },
    [changeState, clearConnection, clearDuration, clearNoAnswer, emitEnd, finish, startCamera],
  );

  const startCall = useCallback(async () => {
    const socket = getSocket();
    if (!socket?.connected) throw new Error("Socket връзката не е налична.");
    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      throw new Error("Получателят на видео обаждането е невалиден.");
    }
    if (
      startingRef.current || acceptingRef.current || callIdRef.current ||
      incomingRef.current || ACTIVE_STATES.includes(stateRef.current)
    ) return;

    startingRef.current = true;
    clearReset();
    generationRef.current += 1;
    const callId = Crypto.randomUUID();
    if (claimActiveCall && !claimActiveCall(callId)) {
      startingRef.current = false;
      return;
    }
    callIdRef.current = callId;
    targetIdRef.current = recipientId;
    changeState("calling");
    try {
      const peer = await createPeer(recipientId, callId);
      if (callIdRef.current !== callId) return;
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      if (callIdRef.current !== callId) return;
      await peer.setLocalDescription(offer);
      if (callIdRef.current !== callId) return;
      if (!offer.sdp) throw new Error("Неуспешно създаване на SDP offer.");
      socket.emit("call:offer", {
        call_id: callId,
        recipient_id: recipientId,
        description: { type: "offer", sdp: offer.sdp },
      });
      startingRef.current = false;
      noAnswerRef.current = setTimeout(() => {
        noAnswerRef.current = null;
        if (callIdRef.current === callId && stateRef.current === "calling") {
          emitEnd(callId, recipientId, "timeout");
          finish(callId, "timeout");
        }
      }, NO_ANSWER_MS);
    } catch (error) {
      if (callIdRef.current !== callId) return;
      if (callIdRef.current === callId) {
        emitEnd(callId, recipientId, "failed");
        finish(callId, "failed");
      }
      throw error;
    }
  }, [changeState, claimActiveCall, clearReset, createPeer, emitEnd, finish, recipientId]);

  const acceptCall = useCallback(async () => {
    const socket = getSocket();
    const call = incomingRef.current;
    if (
      !socket?.connected || !call?.description || call.description.type !== "offer" ||
      acceptingRef.current || acceptedIdRef.current === call.call_id
    ) return;
    if (claimActiveCall && !claimActiveCall(call.call_id)) return;
    acceptingRef.current = true;
    acceptedIdRef.current = call.call_id;
    clearReset();
    generationRef.current += 1;
    callIdRef.current = call.call_id;
    targetIdRef.current = call.sender_id;
    changeState("connecting");
    changeIncoming(null);
    try {
      const peer = await createPeer(call.sender_id, call.call_id, true);
      if (callIdRef.current !== call.call_id) return;
      await peer.setRemoteDescription(new RTCSessionDescription(call.description));
      if (callIdRef.current !== call.call_id) return;
      remoteSetRef.current = true;
      await flushCandidates();
      if (callIdRef.current !== call.call_id) return;
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      if (callIdRef.current !== call.call_id) return;
      if (!answer.sdp) throw new Error("Неуспешно създаване на SDP answer.");
      socket.emit("call:answer", {
        call_id: call.call_id,
        recipient_id: call.sender_id,
        description: { type: "answer", sdp: answer.sdp },
      });
      if (currentUserId) {
        socket.emit("call:end", {
          call_id: call.call_id,
          recipient_id: currentUserId,
          reason: "answered_elsewhere",
        });
      }
      acceptingRef.current = false;
      onIncomingCallAccepted?.(call.call_id);
      startConnectionTimeout(call.call_id, call.sender_id);
    } catch (error) {
      if (callIdRef.current !== call.call_id) return;
      if (callIdRef.current === call.call_id) {
        emitEnd(call.call_id, call.sender_id, "failed");
        finish(call.call_id, "failed");
      }
      throw error;
    }
  }, [changeIncoming, changeState, claimActiveCall, clearReset, createPeer, currentUserId, emitEnd, finish, flushCandidates, onIncomingCallAccepted, startConnectionTimeout]);

  const rejectCall = useCallback(() => {
    const call = incomingRef.current;
    if (!call) return;
    emitEnd(call.call_id, call.sender_id, "rejected");
    finish(call.call_id, "rejected");
  }, [emitEnd, finish]);

  const endCall = useCallback(() => {
    const callId = callIdRef.current;
    const targetId = targetIdRef.current;
    if (!callId || !targetId) return;
    const reason: CallEndReason = stateRef.current === "calling" ? "cancelled" : "hangup";
    emitEnd(callId, targetId, reason);
    finish(callId, reason === "cancelled" ? "cancelled" : "ended");
  }, [emitEnd, finish]);

  useEffect(() => {
    if (!acceptedIncomingCall) return;
    for (const payload of pendingIncomingIceCandidates) {
      const key = candidateKey(payload);
      if (candidateKeysRef.current.has(key)) continue;
      candidateKeysRef.current.add(key);
      candidatesRef.current.push(new RTCIceCandidate(payload));
    }
  }, [acceptedIncomingCall, pendingIncomingIceCandidates]);

  useEffect(() => {
    if (!acceptedIncomingCall || acceptedIncomingCall.description?.type !== "offer" ||
        acceptedIdRef.current === acceptedIncomingCall.call_id || acceptingRef.current) return;
    incomingRef.current = acceptedIncomingCall;
    void acceptCall().catch((error: unknown) => {
      console.error("Неуспешно приемане на входящото обаждане:", error);
    });
  }, [acceptCall, acceptedIncomingCall]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !acceptedIncomingCall) return;
    const retryAccept = () => {
      if (
        !acceptedIncomingCall.description ||
        acceptedIncomingCall.description.type !== "offer" ||
        acceptedIdRef.current === acceptedIncomingCall.call_id ||
        acceptingRef.current
      ) {
        return;
      }
      incomingRef.current = acceptedIncomingCall;
      void acceptCall().catch((error: unknown) => {
        console.error("Неуспешно приемане на входящото обаждане:", error);
      });
    };
    socket.on("connect", retryAccept);
    if (socket.connected) {
      retryAccept();
    }
    return () => {
      socket.off("connect", retryAccept);
    };
  }, [acceptCall, acceptedIncomingCall]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onAnswer = async (payload: CallServerPayload) => {
      const callId = callIdRef.current;
      const peer = peerRef.current;
      const targetId = targetIdRef.current;
      if (!callId || !peer || !targetId || payload.call_id !== callId ||
          payload.description?.type !== "answer" || stateRef.current !== "calling") return;
      clearNoAnswer();
      changeState("connecting");
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(payload.description));
        if (callIdRef.current !== callId || peerRef.current !== peer || !isPeerOpen(peer)) {
          return;
        }
        remoteSetRef.current = true;
        await flushCandidates();
        if (callIdRef.current === callId && isPeerOpen(peerRef.current)) {
          startConnectionTimeout(callId, targetId);
        }
      } catch (error) {
        if (
          isPeerShutdownError(error) ||
          callIdRef.current !== callId ||
          peerRef.current !== peer
        ) {
          return;
        }
        console.error("Неуспешна обработка на call answer:", error);
        if (callIdRef.current === callId) {
          emitEnd(callId, targetId, "failed");
          finish(callId, "failed");
        }
      }
    };
    const onCandidate = async (payload: CallServerPayload) => {
      if (!payload.candidate || payload.call_id !== callIdRef.current) return;
      const key = candidateKey(payload.candidate);
      if (candidateKeysRef.current.has(key)) return;
      candidateKeysRef.current.add(key);
      const candidate = new RTCIceCandidate(payload.candidate);
      const peer = peerRef.current;
      if (!isPeerOpen(peer) || !remoteSetRef.current) {
        candidatesRef.current.push(candidate);
        return;
      }
      try {
        await peer.addIceCandidate(candidate);
      } catch (error) {
        if (isPeerShutdownError(error)) return;
        if (payload.call_id === callIdRef.current && isPeerOpen(peer)) {
          console.error("ICE candidate грешка:", error);
        }
      }
    };
    const onEnd = (payload: CallServerPayload) => {
      if (payload.call_id !== callIdRef.current) return;
      if (
        (payload.reason === "answered_elsewhere" ||
          payload.reason === "rejected_elsewhere") &&
        currentUserId !== undefined &&
        Number(payload.sender_id) === currentUserId
      ) {
        return;
      }
      finish(payload.call_id, stateForReason(payload.reason));
    };
    const onDisconnect = () => {
      const callId = callIdRef.current;
      if (callId && ACTIVE_STATES.includes(stateRef.current)) finish(callId, "failed");
    };
    const onAccepted = (payload: CallServerPayload) => {
      console.log("[CALL] received call:accepted callId=" + payload.call_id);
    };
    socket.on("call:answer", onAnswer);
    socket.on("call:accepted", onAccepted);
    socket.on("call:ice-candidate", onCandidate);
    socket.on("call:end", onEnd);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("call:answer", onAnswer);
      socket.off("call:accepted", onAccepted);
      socket.off("call:ice-candidate", onCandidate);
      socket.off("call:end", onEnd);
      socket.off("disconnect", onDisconnect);
    };
  }, [changeState, clearNoAnswer, currentUserId, emitEnd, finish, flushCandidates, startConnectionTimeout]);

  useEffect(() => () => {
    mountedRef.current = false;
    const callId = callIdRef.current;
    clearTimers();
    peerRef.current?.close();
    peerRef.current = null;
    stopCamera();
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;
    if (callId) releaseActiveCall?.(callId);
    callIdRef.current = null;
    candidatesRef.current = [];
    candidateKeysRef.current.clear();
  }, [clearTimers, releaseActiveCall, stopCamera]);

  const toggleMicrophone = useCallback(() => {
    if (stateRef.current !== "connected" || !localStream) return;
    const tracks = localStream.getAudioTracks();
    if (!tracks.length) return;
    const enabled = !tracks[0].enabled;
    tracks.forEach((track) => { track.enabled = enabled; });
    setIsMicrophoneEnabled(enabled);
  }, [localStream]);
  const toggleCamera = useCallback(() => {
    if (stateRef.current !== "connected" || !localStream) return;
    const tracks = localStream.getVideoTracks();
    if (!tracks.length) return;
    const enabled = !tracks[0].enabled;
    tracks.forEach((track) => { track.enabled = enabled; });
    setIsCameraEnabled(enabled);
  }, [localStream]);
  const switchCamera = useCallback(() => {
    if (stateRef.current !== "connected" || !localStream) return;
    (localStream.getVideoTracks()[0] as SwitchableTrack | undefined)?._switchCamera?.();
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    incomingCall,
    isCalling: callState === "calling",
    isInCall: callState === "connected",
    callState,
    callDurationSeconds,
    isMicrophoneEnabled,
    isCameraEnabled,
    startCamera,
    stopCamera,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMicrophone,
    toggleCamera,
    switchCamera,
  };
}
