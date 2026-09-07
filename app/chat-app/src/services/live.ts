import { authorizedJson } from "@/services/session-http";
import type {
  LiveComment,
  LiveCommentResponse,
  LiveCommentsResponse,
  LiveListResponse,
  LiveStream,
  LiveStreamResponse,
} from "@/types/live";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("Липсва EXPO_PUBLIC_API_URL.");
}

function request<T>(endpoint: string, token: string, options: RequestInit = {}): Promise<T> {
  return authorizedJson<T>(`${API_URL}${endpoint}`, token, options);
}

export async function listActiveLives(
  token: string,
  options: { limit?: number; beforeId?: number; signal?: AbortSignal } = {},
): Promise<LiveListResponse> {
  const params = new URLSearchParams();

  if (options.limit) {
    params.set("limit", String(options.limit));
  }

  if (options.beforeId) {
    params.set("before_id", String(options.beforeId));
  }

  const query = params.toString();

  return request<LiveListResponse>(
    `/api/mobile/lives${query ? `?${query}` : ""}`,
    token,
    { signal: options.signal },
  );
}

export async function createLive(token: string, title?: string): Promise<LiveStream> {
  const response = await request<LiveStreamResponse>("/api/mobile/lives", token, {
    method: "POST",
    body: JSON.stringify(title ? { title } : {}),
  });

  return response.data;
}

export async function getLive(token: string, liveId: number): Promise<LiveStream> {
  const response = await request<LiveStreamResponse>(`/api/mobile/lives/${liveId}`, token);

  return response.data;
}

export async function startLive(token: string, liveId: number): Promise<LiveStream> {
  const response = await request<LiveStreamResponse>(
    `/api/mobile/lives/${liveId}/start`,
    token,
    { method: "POST" },
  );

  return response.data;
}

export async function endLive(token: string, liveId: number): Promise<LiveStream> {
  const response = await request<LiveStreamResponse>(
    `/api/mobile/lives/${liveId}/end`,
    token,
    { method: "POST" },
  );

  return response.data;
}

export async function joinLive(token: string, liveId: number): Promise<LiveStream> {
  const response = await request<LiveStreamResponse>(
    `/api/mobile/lives/${liveId}/join`,
    token,
    { method: "POST" },
  );

  return response.data;
}

export async function leaveLive(token: string, liveId: number): Promise<LiveStream> {
  const response = await request<LiveStreamResponse>(
    `/api/mobile/lives/${liveId}/leave`,
    token,
    { method: "POST" },
  );

  return response.data;
}

export async function listLiveComments(
  token: string,
  liveId: number,
  options: { limit?: number; beforeId?: number } = {},
): Promise<LiveCommentsResponse> {
  const params = new URLSearchParams();

  if (options.limit) {
    params.set("limit", String(options.limit));
  }

  if (options.beforeId) {
    params.set("before_id", String(options.beforeId));
  }

  const query = params.toString();

  return request<LiveCommentsResponse>(
    `/api/mobile/lives/${liveId}/comments${query ? `?${query}` : ""}`,
    token,
  );
}

export async function postLiveComment(
  token: string,
  liveId: number,
  body: string,
): Promise<LiveComment> {
  const response = await request<LiveCommentResponse>(
    `/api/mobile/lives/${liveId}/comments`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    },
  );

  return response.data;
}
