export interface CallDescription {
  type: "offer" | "answer";
  sdp: string;
}

export interface CallIceCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface CallClientPayload {
  call_id: string;
  recipient_id: number;
  description?: CallDescription;
  candidate?: CallIceCandidate;
  reason?: string;
}
