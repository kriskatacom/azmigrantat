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
  CallIceCandidate,
  CallServerPayload,
} from "@/services/video-call";

export type CallState =
  | "idle"
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "rejected"
  | "ended"
  | "failed";

type UseVideoCallOptions = {
  recipientId: number;
  acceptedIncomingCall?: CallServerPayload | null;
  pendingIncomingIceCandidates?: CallIceCandidate[];
  onIncomingCallAccepted?: (callId: string) => void;
};

type SwitchableVideoTrack = MediaStreamTrack & {
  _switchCamera?: () => void;
};

type IceCandidateEvent = {
  candidate: {
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
  } | null;
};

const PEER_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function getCandidateKey(candidate: CallIceCandidate) {
  return `${candidate.candidate}:${candidate.sdpMid ?? ""}:${candidate.sdpMLineIndex ?? ""}`;
}

export function useVideoCall({
  recipientId,
  acceptedIncomingCall,
  pendingIncomingIceCandidates = [],
  onIncomingCallAccepted,
}: UseVideoCallOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const { localStream, startCamera, stopCamera } = useLocalMedia();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallServerPayload | null>(
    null,
  );
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);

  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const recipientIdRef = useRef<number | null>(null);
  const incomingCallRef = useRef<CallServerPayload | null>(null);
  const remoteDescriptionSetRef = useRef(false);
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const acceptedCallIdRef = useRef<string | null>(null);
  const bufferedCandidateKeysRef = useRef<Set<string>>(new Set());

  const updateIncomingCall = useCallback((call: CallServerPayload | null) => {
    incomingCallRef.current = call;
    setIncomingCall(call);
  }, []);

  const closePeerConnection = useCallback(() => {
    peerConnectionRef.current?.close();

    peerConnectionRef.current = null;
    callIdRef.current = null;
    recipientIdRef.current = null;

    remoteDescriptionSetRef.current = false;
    pendingIceCandidatesRef.current = [];
    bufferedCandidateKeysRef.current.clear();

    updateIncomingCall(null);

    setRemoteStream(null);

    setIsCalling(false);
    setIsInCall(false);

    setIsMicrophoneEnabled(true);
    setIsCameraEnabled(true);
  }, [updateIncomingCall]);

  const flushPendingIceCandidates = useCallback(async () => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection || !remoteDescriptionSetRef.current) return;

    const candidates = pendingIceCandidatesRef.current;
    pendingIceCandidatesRef.current = [];

    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(candidate);
    }
  }, []);

  const createPeerConnection = useCallback(
    async (
      targetUserId: number,
      callId: string,
      preservePendingIceCandidates = false,
    ) => {
      peerConnectionRef.current?.close();
      setRemoteStream(null);
      remoteDescriptionSetRef.current = false;
      if (!preservePendingIceCandidates) pendingIceCandidatesRef.current = [];

      const peerConnection = new RTCPeerConnection(PEER_CONFIG);
      peerConnectionRef.current = peerConnection;
      callIdRef.current = callId;
      recipientIdRef.current = targetUserId;

      const stream = await startCamera();
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.ontrack = (event: { streams?: MediaStream[] }) => {
        const stream = event.streams?.[0];
        console.log("WebRTC ontrack:", stream?.id);
        if (!stream) return;

        setRemoteStream((currentStream) => {
          if (currentStream?.id === stream.id) return currentStream;
          console.log("Задаване на нов remote stream:", stream.id);
          return stream;
        });
      };

      peerConnection.onicecandidate = (event: IceCandidateEvent) => {
        if (!event.candidate) return;

        const socket = getSocket();
        const currentCallId = callIdRef.current;
        const currentRecipientId = recipientIdRef.current;
        if (!socket || !currentCallId || !currentRecipientId) return;

        socket.emit("call:ice-candidate", {
          call_id: currentCallId,
          recipient_id: currentRecipientId,
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
        });
      };

      peerConnection.onconnectionstatechange = () => {
        console.log("WebRTC connection state:", peerConnection.connectionState);

        if (peerConnection.connectionState === "connected") {
          setIsCalling(false);
          setIsInCall(true);
          setCallState("connected");
        }

        if (peerConnection.connectionState === "failed") {
          setIsCalling(false);
          setIsInCall(false);
          setRemoteStream(null);
          setCallState("failed");
        }

        if (peerConnection.connectionState === "closed") {
          setIsCalling(false);
          setIsInCall(false);
          setRemoteStream(null);
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log("WebRTC ICE state:", peerConnection.iceConnectionState);
      };

      return peerConnection;
    },
    [startCamera],
  );

  const startCall = useCallback(async () => {
    const socket = getSocket();
    if (!socket) throw new Error("Socket връзката не е налична.");
    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      throw new Error("Получателят на видео обаждането е невалиден.");
    }
    if (isCalling || isInCall || incomingCallRef.current) return;

    const callId = Crypto.randomUUID();
    setIsCalling(true);
    setCallState("calling");

    try {
      const peerConnection = await createPeerConnection(recipientId, callId);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peerConnection.setLocalDescription(offer);
      if (!offer.sdp) throw new Error("Неуспешно създаване на SDP offer.");

      socket.emit("call:offer", {
        call_id: callId,
        recipient_id: recipientId,
        description: { type: "offer", sdp: offer.sdp },
      });
    } catch (error) {
      setCallState("failed");
      closePeerConnection();
      throw error;
    }
  }, [
    closePeerConnection,
    createPeerConnection,
    isCalling,
    isInCall,
    recipientId,
  ]);

  const acceptCall = useCallback(async () => {
    const socket = getSocket();
    const call = incomingCallRef.current;
    if (!socket || !call?.description || call.description.type !== "offer")
      return;

    updateIncomingCall(null);

    try {
      const peerConnection = await createPeerConnection(
        call.sender_id,
        call.call_id,
        true,
      );
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(call.description),
      );
      remoteDescriptionSetRef.current = true;
      await flushPendingIceCandidates();

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      if (!answer.sdp) throw new Error("Неуспешно създаване на SDP answer.");

      socket.emit("call:answer", {
        call_id: call.call_id,
        recipient_id: call.sender_id,
        description: { type: "answer", sdp: answer.sdp },
      });
      setIsInCall(true);
    } catch (error) {
      closePeerConnection();
      throw error;
    }
  }, [
    closePeerConnection,
    createPeerConnection,
    flushPendingIceCandidates,
    updateIncomingCall,
  ]);

  useEffect(() => {
    if (!acceptedIncomingCall) return;

    for (const candidatePayload of pendingIncomingIceCandidates) {
      const key = getCandidateKey(candidatePayload);
      if (bufferedCandidateKeysRef.current.has(key)) continue;
      bufferedCandidateKeysRef.current.add(key);
      pendingIceCandidatesRef.current.push(new RTCIceCandidate(candidatePayload));
    }
  }, [acceptedIncomingCall, pendingIncomingIceCandidates]);

  useEffect(() => {
    if (
      !acceptedIncomingCall ||
      acceptedIncomingCall.description?.type !== "offer" ||
      acceptedCallIdRef.current === acceptedIncomingCall.call_id
    ) {
      return;
    }

    acceptedCallIdRef.current = acceptedIncomingCall.call_id;
    callIdRef.current = acceptedIncomingCall.call_id;
    recipientIdRef.current = acceptedIncomingCall.sender_id;
    remoteDescriptionSetRef.current = false;
    updateIncomingCall(acceptedIncomingCall);
    setCallState("connecting");

    void acceptCall()
      .then(() => onIncomingCallAccepted?.(acceptedIncomingCall.call_id))
      .catch((error: unknown) => {
        console.error("Неуспешно приемане на входящото обаждане:", error);
        setCallState("failed");
      });
  }, [
    acceptCall,
    acceptedIncomingCall,
    onIncomingCallAccepted,
    updateIncomingCall,
  ]);

  const rejectCall = useCallback(() => {
    const socket = getSocket();
    const call = incomingCallRef.current;

    if (socket && call) {
      socket.emit("call:end", {
        call_id: call.call_id,
        recipient_id: call.sender_id,
        reason: "rejected",
      });
    }

    setCallState("rejected");

    closePeerConnection();
    stopCamera();
  }, [closePeerConnection, stopCamera]);

  const endCall = useCallback(() => {
    const socket = getSocket();

    const callId = callIdRef.current;
    const targetUserId = recipientIdRef.current;

    if (socket && callId && targetUserId) {
      socket.emit("call:end", {
        call_id: callId,
        recipient_id: targetUserId,
        reason: "hangup",
      });
    }

    setCallState("ended");

    closePeerConnection();
    stopCamera();
  }, [closePeerConnection, stopCamera]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOffer = (payload: CallServerPayload) => {
      if (!payload.description || payload.description.type !== "offer") {
        return;
      }

      if (callIdRef.current !== payload.call_id) {
        pendingIceCandidatesRef.current = [];
      }

      callIdRef.current = payload.call_id;
      recipientIdRef.current = payload.sender_id;
      remoteDescriptionSetRef.current = false;

      updateIncomingCall(payload);

      setIsCalling(false);
      setIsInCall(false);
      setCallState("ringing");
    };

    const handleAnswer = async (payload: CallServerPayload) => {
      if (
        !payload.description ||
        payload.description.type !== "answer" ||
        payload.call_id !== callIdRef.current
      )
        return;

      const peerConnection = peerConnectionRef.current;
      if (!peerConnection) return;

      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(payload.description),
        );
        remoteDescriptionSetRef.current = true;
        await flushPendingIceCandidates();
        setIsCalling(false);
        setIsInCall(true);
        setCallState("connected");
      } catch (error) {
        console.error("Неуспешна обработка на call answer:", error);
        closePeerConnection();
      }
    };

    const handleIceCandidate = async (payload: CallServerPayload) => {
      if (!payload.candidate || payload.call_id !== callIdRef.current) return;

      const candidateKey = getCandidateKey(payload.candidate);
      if (bufferedCandidateKeysRef.current.has(candidateKey)) return;
      bufferedCandidateKeysRef.current.add(candidateKey);

      const candidate = new RTCIceCandidate(payload.candidate);
      const peerConnection = peerConnectionRef.current;
      if (!peerConnection || !remoteDescriptionSetRef.current) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error("Неуспешно добавяне на ICE candidate:", error);
      }
    };

    const handleEnd = (payload: CallServerPayload) => {
      if (
        payload.call_id !== callIdRef.current &&
        payload.call_id !== incomingCallRef.current?.call_id
      ) {
        return;
      }

      setCallState(payload.reason === "rejected" ? "rejected" : "ended");

      closePeerConnection();
      stopCamera();
    };

    socket.on("call:offer", handleOffer);
    socket.on("call:answer", handleAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:end", handleEnd);

    return () => {
      socket.off("call:offer", handleOffer);
      socket.off("call:answer", handleAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:end", handleEnd);
    };
  }, [closePeerConnection, flushPendingIceCandidates, updateIncomingCall]);

  useEffect(() => {
    return () => {
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
    };
  }, []);

  const toggleMicrophone = useCallback(() => {
    const stream = localStream;

    if (!stream) {
      return;
    }

    const audioTracks = stream.getAudioTracks();

    if (audioTracks.length === 0) {
      return;
    }

    const nextEnabled = !audioTracks[0].enabled;

    audioTracks.forEach((track) => {
      track.enabled = nextEnabled;
    });

    setIsMicrophoneEnabled(nextEnabled);
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    const stream = localStream;

    if (!stream) {
      return;
    }

    const videoTracks = stream.getVideoTracks();

    if (videoTracks.length === 0) {
      return;
    }

    const nextEnabled = !videoTracks[0].enabled;

    videoTracks.forEach((track) => {
      track.enabled = nextEnabled;
    });

    setIsCameraEnabled(nextEnabled);
  }, [localStream]);

  const switchCamera = useCallback(() => {
    const stream = localStream;

    if (!stream) {
      return;
    }

    const videoTrack = stream.getVideoTracks()[0] as
      | SwitchableVideoTrack
      | undefined;

    videoTrack?._switchCamera?.();
  }, [localStream]);

  return {
    localStream,
    remoteStream,

    incomingCall,
    isCalling,
    isInCall,
    callState,

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
