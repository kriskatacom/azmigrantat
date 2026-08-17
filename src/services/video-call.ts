export type CallDescription = {
  type: "offer" | "answer";
  sdp: string;
};

export type CallIceCandidate = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

export type CallEndReason =
  | "rejected"
  | "timeout"
  | "busy"
  | "cancelled"
  | "hangup"
  | "failed"
  | "connection_timeout"
  | "answered_elsewhere"
  | "rejected_elsewhere";

export type CallState =
  | "idle"
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "rejected"
  | "busy"
  | "timeout"
  | "cancelled"
  | "ended"
  | "failed"
  | "connection_timeout";

export type CallClientPayload = {
  call_id: string;
  recipient_id: number;
  description?: CallDescription;
  candidate?: CallIceCandidate;
  reason?: CallEndReason;
};

export type CallServerPayload = {
  call_id: string;
  sender_id: number;
  description?: CallDescription;
  candidate?: CallIceCandidate;
  reason?: CallEndReason;
};
