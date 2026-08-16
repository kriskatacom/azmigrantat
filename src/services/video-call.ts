export type CallDescription = {
  type: "offer" | "answer";
  sdp: string;
};

export type CallIceCandidate = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

export type CallClientPayload = {
  call_id: string;
  recipient_id: number;
  description?: CallDescription;
  candidate?: CallIceCandidate;
  reason?: string;
};

export type CallServerPayload = {
  call_id: string;
  sender_id: number;
  description?: CallDescription;
  candidate?: CallIceCandidate;
  reason?: string;
};
