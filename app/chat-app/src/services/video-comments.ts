import { authorizedJson } from "@/services/session-http";
import type { VideoCommentResponse, VideoCommentsPage } from "@/types/video-comments";

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

function apiUrl(path: string): string {
  if (!API_URL) throw new Error("Липсва API адрес.");
  return `${API_URL}${path}`;
}

/** Lists newest top-level comments using a stable ID cursor. */
export function listVideoComments(
  token: string,
  videoId: number,
  options: { limit?: number; beforeId?: number | null; signal?: AbortSignal } = {},
): Promise<VideoCommentsPage> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 20));
  if (options.beforeId) params.set("before_id", String(options.beforeId));

  return authorizedJson(apiUrl(`/api/mobile/videos/${videoId}/comments?${params}`), token, {
    signal: options.signal,
  });
}

/** Lists descendants of one root thread without imposing a reply-depth limit. */
export function listVideoCommentReplies(
  token: string,
  commentId: number,
  options: { limit?: number; afterId?: number | null; signal?: AbortSignal } = {},
): Promise<VideoCommentsPage> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 20));
  if (options.afterId) params.set("after_id", String(options.afterId));

  return authorizedJson(apiUrl(`/api/mobile/video-comments/${commentId}/replies?${params}`), token, {
    signal: options.signal,
  });
}

export function createVideoComment(
  token: string,
  videoId: number,
  body: string,
  parentId?: number | null,
): Promise<VideoCommentResponse> {
  return authorizedJson(apiUrl(`/api/mobile/videos/${videoId}/comments`), token, {
    method: "POST",
    body: JSON.stringify({ body, parent_id: parentId ?? null }),
  });
}

export function likeVideoComment(token: string, commentId: number): Promise<VideoCommentResponse> {
  return authorizedJson(apiUrl(`/api/mobile/video-comments/${commentId}/like`), token, {
    method: "POST",
  });
}

export function unlikeVideoComment(token: string, commentId: number): Promise<VideoCommentResponse> {
  return authorizedJson(apiUrl(`/api/mobile/video-comments/${commentId}/like`), token, {
    method: "DELETE",
  });
}

export function deleteVideoComment(token: string, commentId: number): Promise<VideoCommentResponse> {
  return authorizedJson(apiUrl(`/api/mobile/video-comments/${commentId}`), token, {
    method: "DELETE",
  });
}
