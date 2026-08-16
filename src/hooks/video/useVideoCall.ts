import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  type MediaStream,
} from "react-native-webrtc";

import { useLocalMedia } from "@/hooks/video/useLocalMedia";
import { getSocket } from "@/services/socket";

type CallDescription = {
  type: "offer" | "answer";
  sdp: string;
};

type CallIceCandidate = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

type CallServerPayload = {
  call_id: string;
  sender_id: number;
  description?: CallDescription;
  candidate?: CallIceCandidate;
  reason?: string;
};

type UseVideoCallOptions = {
  recipientId: number;
};

type IceCandidateEvent = {
  candidate: {
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
  } | null;
};

const PEER_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

export function useVideoCall({ recipientId }: UseVideoCallOptions) {
  const { localStream, startCamera, stopCamera } = useLocalMedia();

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isInCall, setIsInCall] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const callIdRef = useRef<string | null>(null);

  const recipientIdRef = useRef<number | null>(null);

  const remoteDescriptionSetRef = useRef(false);

  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([]);

  const closePeerConnection = useCallback(() => {
    peerConnectionRef.current?.close();

    peerConnectionRef.current = null;
    callIdRef.current = null;
    recipientIdRef.current = null;

    remoteDescriptionSetRef.current = false;
    pendingIceCandidatesRef.current = [];

    setRemoteStream(null);
    setIsInCall(false);
  }, []);

  const flushPendingIceCandidates = useCallback(async () => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) {
      return;
    }

    const candidates = [...pendingIceCandidatesRef.current];

    pendingIceCandidatesRef.current = [];

    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(candidate);
    }
  }, []);

  const createPeerConnection = useCallback(
    async (targetUserId: number, callId: string) => {
      peerConnectionRef.current?.close();

      setRemoteStream(null);

      remoteDescriptionSetRef.current = false;
      pendingIceCandidatesRef.current = [];

      const stream = await startCamera();

      const peerConnection = new RTCPeerConnection(PEER_CONFIG);

      peerConnectionRef.current = peerConnection;

      callIdRef.current = callId;
      recipientIdRef.current = targetUserId;

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.ontrack = (event: { streams?: MediaStream[] }) => {
        const stream = event.streams?.[0];

        console.log("WebRTC ontrack:", stream?.id);

        if (!stream) {
          return;
        }

        setRemoteStream((currentStream) => {
          if (currentStream?.id === stream.id) {
            return currentStream;
          }

          console.log("Задаване на нов remote stream:", stream.id);

          return stream;
        });
      };

      peerConnection.onicecandidate = (event: IceCandidateEvent) => {
        if (!event.candidate) {
          return;
        }

        const socket = getSocket();

        const currentCallId = callIdRef.current;
        const currentRecipientId = recipientIdRef.current;

        if (!socket || !currentCallId || !currentRecipientId) {
          return;
        }

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
          setIsInCall(true);
        }

        if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "closed"
        ) {
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

    if (!socket) {
      throw new Error("Socket връзката не е налична.");
    }

    const callId = Crypto.randomUUID();

    const peerConnection = await createPeerConnection(recipientId, callId);

    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await peerConnection.setLocalDescription(offer);

    if (!offer.sdp) {
      throw new Error("Неуспешно създаване на SDP offer.");
    }

    socket.emit("call:offer", {
      call_id: callId,
      recipient_id: recipientId,
      description: {
        type: "offer",
        sdp: offer.sdp,
      },
    });

    setIsInCall(true);
  }, [createPeerConnection, recipientId]);

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

    closePeerConnection();
  }, [closePeerConnection]);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return;
    }

    const handleOffer = async (payload: CallServerPayload) => {
      if (!payload.description || payload.description.type !== "offer") {
        return;
      }

      const peerConnection = await createPeerConnection(
        payload.sender_id,
        payload.call_id,
      );

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(payload.description),
      );

      remoteDescriptionSetRef.current = true;

      await flushPendingIceCandidates();

      const answer = await peerConnection.createAnswer();

      await peerConnection.setLocalDescription(answer);

      if (!answer.sdp) {
        return;
      }

      socket.emit("call:answer", {
        call_id: payload.call_id,

        recipient_id: payload.sender_id,

        description: {
          type: "answer",
          sdp: answer.sdp,
        },
      });

      setIsInCall(true);
    };

    const handleAnswer = async (payload: CallServerPayload) => {
      if (!payload.description || payload.description.type !== "answer") {
        return;
      }

      if (payload.call_id !== callIdRef.current) {
        return;
      }

      const peerConnection = peerConnectionRef.current;

      if (!peerConnection) {
        return;
      }

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(payload.description),
      );

      remoteDescriptionSetRef.current = true;

      await flushPendingIceCandidates();

      setIsInCall(true);
    };

    const handleIceCandidate = async (payload: CallServerPayload) => {
      if (!payload.candidate || payload.call_id !== callIdRef.current) {
        return;
      }

      const candidate = new RTCIceCandidate(payload.candidate);

      const peerConnection = peerConnectionRef.current;

      if (!peerConnection || !remoteDescriptionSetRef.current) {
        pendingIceCandidatesRef.current.push(candidate);

        return;
      }

      await peerConnection.addIceCandidate(candidate);
    };

    const handleEnd = (payload: CallServerPayload) => {
      if (payload.call_id !== callIdRef.current) {
        return;
      }

      closePeerConnection();
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
  }, [closePeerConnection, createPeerConnection, flushPendingIceCandidates]);

  useEffect(() => {
    return () => {
      peerConnectionRef.current?.close();
    };
  }, []);

  return {
    localStream,
    remoteStream,
    isInCall,

    startCamera,
    stopCamera,

    startCall,
    endCall,
  };
}
