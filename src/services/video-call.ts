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
  | "unavailable"
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
  | "unavailable"
  | "connection_timeout";

export type CallType = "audio" | "video";

export function parseCallType(value: unknown): CallType {
  return value === "audio" ? "audio" : "video";
}

export type CallClientPayload = {
  call_id: string;
  recipient_id: number;
  description?: CallDescription;
  candidate?: CallIceCandidate;
  reason?: CallEndReason;
  call_type?: CallType;
  enabled?: boolean;
};

export type CallServerPayload = {
  call_id: string;
  sender_id: number;
  description?: CallDescription;
  candidate?: CallIceCandidate;
  reason?: CallEndReason;
  caller_name?: string;
  caller_avatar?: string | null;
  call_type?: CallType;
  timestamp?: number;
  enabled?: boolean;
};

export type CallStatePayload = {
  call: CallServerPayload | null;
  pending_ice_candidates: CallIceCandidate[];
  status: "ringing" | "accepted" | "declined" | "cancelled" | "ended" | "timeout" | "busy" | "failed" | "unavailable" | "idle";
};

export type DeviceRegisterPayload = {
  expo_push_token?: string;
  app_state?: "active" | "background";
};

export type AppStatePayload = {
  app_state: "active" | "background";
};

export const CALL_NO_ANSWER_MS = 30_000;
