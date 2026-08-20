import type {
  CallIceCandidate,
  CallServerPayload,
} from "@/services/video-call";

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

if (!SOCKET_URL) {
  throw new Error("Липсва EXPO_PUBLIC_SOCKET_URL.");
}

const REALTIME_HTTP_URL = SOCKET_URL.replace(/\/+$/, "");

type ApiErrorResponse = {
  success?: false;
  message?: string;
};

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${REALTIME_HTTP_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const rawResponse = await response.text();
  let data: T | ApiErrorResponse;

  try {
    data = JSON.parse(rawResponse) as T | ApiErrorResponse;
  } catch {
    throw new Error(
      `Realtime сървърът върна невалиден JSON: ${rawResponse.slice(0, 300)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).message ??
        "Възникна грешка при комуникацията с realtime сървъра.",
    );
  }

  return data as T;
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
