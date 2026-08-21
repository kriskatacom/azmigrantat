import { authorizedJson } from "@/services/session-http";
import type {
  CallIceCandidate,
  CallServerPayload,
} from "@/services/video-call";

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

if (!SOCKET_URL) {
  throw new Error("Липсва EXPO_PUBLIC_SOCKET_URL.");
}

const REALTIME_HTTP_URL = SOCKET_URL.replace(/\/+$/, "");

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  return authorizedJson<T>(
    `${REALTIME_HTTP_URL}${endpoint}`,
    token,
    options,
    "Realtime сървърът върна невалиден JSON:",
  );
}

export async function fetchRingingCall(token: string): Promise<{
  call: CallServerPayload | null;
  pending_ice_candidates: CallIceCandidate[];
  status: string;
}> {
  const response = await request<{
    success: true;
    call: CallServerPayload | null;
    pending_ice_candidates: CallIceCandidate[];
    status?: string;
  }>("/calls/ringing", token);

  return {
    call: response.call,
    pending_ice_candidates: response.pending_ice_candidates ?? [],
    status: response.status ?? (response.call ? "ringing" : "idle"),
  };
}

export async function fetchCallById(
  token: string,
  callId: string,
): Promise<{
  call: CallServerPayload | null;
  pending_ice_candidates: CallIceCandidate[];
  status: string;
}> {
  const response = await request<{
    success: true;
    call: CallServerPayload | null;
    pending_ice_candidates: CallIceCandidate[];
    status: string;
  }>(`/calls/${encodeURIComponent(callId)}`, token);

  return {
    call: response.call,
    pending_ice_candidates: response.pending_ice_candidates ?? [],
    status: response.status,
  };
}

export async function declineCallViaHttp(
  token: string,
  callId: string,
): Promise<void> {
  await request("/calls/decline", token, {
    method: "POST",
    body: JSON.stringify({ call_id: callId }),
  });
}

export function getRealtimeHttpUrl(): string {
  return REALTIME_HTTP_URL;
}
