import { authorizedJson } from "@/services/session-http";
import type {
  BeginVideoUploadResponse,
  BunnyUploadCredentials,
  DedicatedUploadCredentials,
  VideoUploadCredentials,
  VideoResponse,
  VideosResponse,
  VideoPlaybackResponse,
  PublicVideosResponse,
  PublicUserSearchResponse,
  VideoEnhancementJobResponse,
  VideoEnhancementMode,
  VideoEnhancementMethod,
  VideoEnhancementTargetShortSide,
  VideoEnhancementOptionsResponse,
} from "@/types/video";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { Platform } from "react-native";
import * as tus from "tus-js-client";
import BunnyNativeUpload, { cancelNativeUpload } from "../../modules/my-module/src/BunnyNativeUploadModule";
import type { BunnyUploadProgressEvent } from "../../modules/my-module/src/BunnyNativeUpload.types";
import { SecureTusUrlStorage, dedicatedTusFingerprint } from "@/services/dedicated-tus-storage";
import { isExpiredUploadStatus, shouldRetryTusStatus } from "@/services/video-upload-policy";
import { parseJsonResponse } from "@/services/http-response";
import { assertDedicatedVideoUrl } from "@/config/environment";
import type { PlaceItem } from "@/services/places";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
let activeNativeUploadId: string | null = null;
let activeTusCancel: (() => void) | null = null;

if (!API_URL) {
  throw new Error("Липсва EXPO_PUBLIC_API_URL.");
}

export function beginVideoUpload(
  token: string,
  input: { title: string; description: string; filename: string; mimeType: string; fileSize: number; categoryId?: number | null; place?: PlaceItem | null },
): Promise<BeginVideoUploadResponse> {
  return authorizedJson<BeginVideoUploadResponse>(
    `${API_URL}/api/mobile/videos/uploads`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        filename: input.filename,
        mime_type: input.mimeType,
        file_size: input.fileSize,
        ...(input.categoryId ? { category_id: input.categoryId } : {}),
        ...(input.place ? { place_id: input.place.id } : {}),
      }),
    },
  );
}

export async function uploadVideoThumbnail(
  token: string,
  videoId: number,
  thumbnail: { uri: string; name: string; mimeType?: string },
): Promise<VideoResponse> {
  const formData = new FormData();
  formData.append("thumbnail", new File(thumbnail.uri));
  const response = await fetch(`${API_URL}/api/mobile/videos/${videoId}/thumbnail`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = (await response.json()) as VideoResponse | { message?: string };
  if (!response.ok) throw new Error("message" in data && data.message ? data.message : "Thumbnail-ът не можа да бъде качен.");
  return data as VideoResponse;
}

export function uploadVideoWithTus(
  file: File,
  credentials: VideoUploadCredentials,
  onProgress: (percentage: number) => void,
  options?: { cancelUrl?: string; authToken?: string },
): Promise<void> {
  if ("authorization_token" in credentials) {
    if (Platform.OS === "android") {
      return uploadVideoWithDedicatedNative(file, credentials, onProgress, options);
    }
    return uploadVideoWithDedicatedTus(file, credentials, onProgress);
  }

  if (Platform.OS === "android") {
    return uploadVideoWithNative(file, credentials as BunnyUploadCredentials, onProgress, options);
  }

  return new Promise((resolve, reject) => {
    let displayedProgress = 0;
    const nativeFileSize = getNativeFileSize(file);

    // Expo's readable stream avoids the Android FileHandle readBytes limit that
    // can stop exactly at 48 MiB for larger picker files.
    const reader = file.readableStream().getReader();
    const upload = new tus.Upload(reader, {
      endpoint: credentials.endpoint,
      uploadSize: nativeFileSize,
      // Keep chunks very small so Expo's JavaScript readable stream yields back
      // to the UI thread frequently. Larger chunks can freeze the modal,
      // percentage and elapsed-time counter while Android reads the file.
      chunkSize: 512 * 1024,
      headers: {
        AuthorizationSignature: credentials.authorization_signature,
        AuthorizationExpire: String(credentials.authorization_expire),
        LibraryId: String(credentials.library_id),
        VideoId: credentials.video_id,
      },
      metadata: {
        filetype: file.type || "video/mp4",
      },
      // Each upload is initialized with a fresh Bunny video GUID. Reusing a
      // persisted tus URL from an older attempt can point at a locked session.
      storeFingerprintForResuming: false,
      retryDelays: [3000, 10000, 20000, 40000, 60000, 90000],
      onShouldRetry: (error, retryAttempt) => {
        const status = error.originalResponse?.getStatus() ?? 0;
        console.warn(
          `[VideoUpload] Повторен опит ${retryAttempt + 1}; HTTP ${status || "network"}.`,
        );
        if (displayedProgress >= 99 && retryAttempt >= 2) {
          console.error("[VideoUpload] Bunny не потвърди финалния upload chunk.");
          return false;
        }
        return status === 0 || status === 409 || status === 423 || status >= 500;
      },
      onError: reject,
      onProgress: (bytesUploaded, bytesTotal) => {
        const measuredProgress = Math.round((bytesUploaded / bytesTotal) * 100);
        // A retry can report the bytes of the current request again, so the
        // raw tus value may move backwards or briefly exceed the total.
        // XHR can report all bytes as sent before Bunny acknowledges the
        // final PATCH. Keep the UI at 99% until tus calls onSuccess.
        displayedProgress = Math.min(
          99,
          Math.max(displayedProgress, measuredProgress),
        );
        onProgress(displayedProgress);
      },
      onSuccess: () => {
        onProgress(100);
        resolve();
      },
    });

    void upload.start();
  });
}

export class UploadTokenExpiredError extends Error {
  constructor() {
    super("Upload token-ът е изтекъл.");
    this.name = "UploadTokenExpiredError";
  }
}

async function uploadVideoWithDedicatedTus(
  file: File,
  credentials: DedicatedUploadCredentials,
  onProgress: (percentage: number) => void,
): Promise<void> {
  assertDedicatedVideoUrl(credentials.endpoint);
  const nativeFileSize = getNativeFileSize(file);
  const storage = new SecureTusUrlStorage();
  const fingerprint = dedicatedTusFingerprint(credentials.user_id, credentials.video_id, credentials.upload_id, file.uri, nativeFileSize);
  const reader = file.readableStream().getReader();
  let displayedProgress = 0;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      activeTusCancel = null;
      if (error) reject(error); else resolve();
    };
    const upload = new tus.Upload(reader, {
      endpoint: credentials.endpoint,
      uploadSize: nativeFileSize,
      chunkSize: 512 * 1024,
      headers: { Authorization: `Bearer ${credentials.authorization_token}` },
      metadata: { filename: file.name || "video", filetype: file.type || "video/mp4" },
      fingerprint: async () => fingerprint,
      urlStorage: storage,
      storeFingerprintForResuming: true,
      removeFingerprintOnSuccess: true,
      retryDelays: [3000, 10000, 20000, 40000, 60000],
      onShouldRetry: (error) => {
        const status = error.originalResponse?.getStatus() ?? 0;
        if (isExpiredUploadStatus(status)) return false;
        return shouldRetryTusStatus(status);
      },
      onError: (error) => {
        const status = "originalResponse" in error ? error.originalResponse?.getStatus() ?? 0 : 0;
        finish(isExpiredUploadStatus(status) ? new UploadTokenExpiredError() : error);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const measuredProgress = Math.round((bytesUploaded / bytesTotal) * 100);
        displayedProgress = Math.min(99, Math.max(displayedProgress, measuredProgress));
        onProgress(displayedProgress);
      },
      onSuccess: () => {
        onProgress(100);
        finish();
      },
    });
    activeTusCancel = () => {
      void upload.abort().finally(() => {
        void storage.removeUpload(`azmigrantat.tus.${encodeURIComponent(fingerprint)}`);
        finish(new Error("Качването е прекратено."));
      });
    };
    void upload.findPreviousUploads()
      .then((previous) => {
        if (previous[0]?.uploadUrl) assertDedicatedVideoUrl(previous[0].uploadUrl);
        if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      })
      .catch((error: unknown) => finish(error instanceof Error ? error : new Error("TUS upload initialization failed.")));
  });
}

function uploadVideoWithDedicatedNative(
  file: File,
  credentials: DedicatedUploadCredentials,
  onProgress: (percentage: number) => void,
  options?: { cancelUrl?: string; authToken?: string },
): Promise<void> {
  assertDedicatedVideoUrl(credentials.endpoint);
  return new Promise((resolve, reject) => {
    let uploadId: string | null = null;
    const subscription = BunnyNativeUpload.addListener("onProgress", (event: BunnyUploadProgressEvent) => {
      if (!uploadId || event.uploadId !== uploadId) return;
      onProgress(Math.max(0, Math.min(100, event.percentage)));
      if (event.status === "success") {
        activeNativeUploadId = null;
        subscription.remove();
        resolve();
      } else if (event.status === "error") {
        activeNativeUploadId = null;
        subscription.remove();
        reject(event.code === "token_expired" ? new UploadTokenExpiredError() : new Error(event.message ?? "Native upload failed."));
      }
    });

    try {
      uploadId = BunnyNativeUpload.startDedicatedUpload(
        file.uri,
        credentials.endpoint,
        credentials.upload_id,
        credentials.authorization_token,
        file.type || "video/mp4",
        file.name || "video",
        JSON.stringify({
          cancelUrl: options?.cancelUrl ?? "",
          authToken: options?.authToken ?? "",
        }),
      );
      activeNativeUploadId = uploadId;
    } catch (error) {
      activeNativeUploadId = null;
      subscription.remove();
      reject(error);
    }
  });
}

export async function uploadVideoWithTusAndRefresh(
  file: File,
  credentials: VideoUploadCredentials,
  onProgress: (percentage: number) => void,
  options: { cancelUrl?: string; authToken?: string } | undefined,
  refresh: () => Promise<VideoUploadCredentials>,
): Promise<void> {
  let current = credentials;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await uploadVideoWithTus(file, current, onProgress, options);
      return;
    } catch (error) {
      if (!(error instanceof UploadTokenExpiredError) || attempt > 0) throw error;
      current = await refresh();
    }
  }
}

function uploadVideoWithNative(
  file: File,
  credentials: BunnyUploadCredentials,
  onProgress: (percentage: number) => void,
  options?: { cancelUrl?: string; authToken?: string },
): Promise<void> {
  return new Promise((resolve, reject) => {
    let uploadId: string | null = null;
    const subscription = BunnyNativeUpload.addListener("onProgress", (event: BunnyUploadProgressEvent) => {
      if (!uploadId || event.uploadId !== uploadId) return;
      onProgress(Math.max(0, Math.min(100, event.percentage)));
      if (event.status === "success") {
        activeNativeUploadId = null;
        subscription.remove();
        resolve();
      } else if (event.status === "error") {
        activeNativeUploadId = null;
        subscription.remove();
        reject(new Error(event.message ?? "Native upload failed."));
      }
    });

    try {
      uploadId = BunnyNativeUpload.startUpload(
        file.uri,
        credentials.endpoint,
        credentials.library_id,
        credentials.video_id,
        credentials.authorization_signature,
        credentials.authorization_expire,
        file.type || "video/mp4",
        JSON.stringify({
          cancelUrl: options?.cancelUrl ?? "",
          authToken: options?.authToken ?? "",
        }),
      );
      activeNativeUploadId = uploadId;
    } catch (error) {
      activeNativeUploadId = null;
      subscription.remove();
      reject(error);
    }
  });
}

export function cancelActiveVideoUpload(): void {
  if (Platform.OS === "android" && activeNativeUploadId) {
    cancelNativeUpload(activeNativeUploadId);
  }
  activeTusCancel?.();
}

export function getNativeFileSize(file: File): number {
  return file.size;
}

export function completeVideoUpload(token: string, videoId: number): Promise<VideoResponse> {
  return authorizedJson<VideoResponse>(
    `${API_URL}/api/mobile/videos/${videoId}/upload-complete`,
    token,
    { method: "POST" },
  );
}

export function refreshVideoUploadSession(token: string, videoId: number): Promise<BeginVideoUploadResponse> {
  return authorizedJson<BeginVideoUploadResponse>(
    `${API_URL}/api/mobile/videos/${videoId}/upload-session`,
    token,
    { method: "POST" },
  );
}

export function listVideos(token: string): Promise<VideosResponse> {
  return authorizedJson<VideosResponse>(`${API_URL}/api/mobile/videos`, token);
}

export function getSavedVideoIds(token: string, videoIds: number[]): Promise<{
  success: true;
  data: { video_ids: number[] };
}> {
  const uniqueIds = [...new Set(videoIds.filter((id) => Number.isInteger(id) && id > 0))].slice(0, 100);
  const params = new URLSearchParams({ video_ids: uniqueIds.join(",") });
  return authorizedJson(`${API_URL}/api/mobile/video-saves?${params}`, token);
}

export function listSavedVideos(token: string, limit = 100): Promise<VideosResponse> {
  const params = new URLSearchParams({ limit: String(Math.min(100, Math.max(1, limit))) });
  return authorizedJson<VideosResponse>(`${API_URL}/api/mobile/saved-videos?${params}`, token);
}

export function saveVideoForUser(token: string, videoId: number): Promise<{
  success: true;
  data: { video_id: number; saved: true };
}> {
  return authorizedJson(`${API_URL}/api/mobile/videos/${videoId}/save`, token, { method: "POST" });
}

export function unsaveVideoForUser(token: string, videoId: number): Promise<{
  success: true;
  data: { video_id: number; saved: false };
}> {
  return authorizedJson(`${API_URL}/api/mobile/videos/${videoId}/save`, token, { method: "DELETE" });
}

export async function listPublicVideos(
  search = "",
  signal?: AbortSignal,
  categoryId?: number,
  placeId?: number,
  pagination?: { page?: number; limit?: number; seed?: number; videoId?: number },
): Promise<PublicVideosResponse> {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (categoryId !== undefined) params.set("category_id", String(categoryId));
  if (placeId !== undefined) params.set("place_id", String(placeId));
  if (pagination?.page !== undefined) params.set("page", String(pagination.page));
  if (pagination?.limit !== undefined) params.set("limit", String(pagination.limit));
  if (pagination?.seed !== undefined) params.set("seed", String(pagination.seed));
  if (pagination?.videoId !== undefined) params.set("video_id", String(pagination.videoId));
  const response = await fetch(`${API_URL}/api/videos${params.toString() ? `?${params}` : ""}`, { signal });
  const data = await parseJsonResponse<PublicVideosResponse | { message?: string }>(
    response,
    "Видео API върна невалиден отговор.",
  );

  if (!response.ok) {
    throw new Error("message" in data && data.message ? data.message : "Видеата не можаха да бъдат заредени.");
  }

  return data as PublicVideosResponse;
}

export async function searchPublicUsers(search: string, signal?: AbortSignal): Promise<PublicUserSearchResponse> {
  const params = new URLSearchParams({ search: search.trim() });
  const response = await fetch(`${API_URL}/api/public/users/search?${params}`, { signal });
  const data = await parseJsonResponse<PublicUserSearchResponse | { message?: string }>(
    response,
    "API за търсене върна невалиден отговор.",
  );

  if (response.status === 404) {
    return { success: true, data: [] };
  }

  if (!response.ok) {
    throw new Error("message" in data && data.message ? data.message : "Потребителите не можаха да бъдат намерени.");
  }

  return data as PublicUserSearchResponse;
}

export function getVideoPlayback(token: string, videoId: number): Promise<VideoPlaybackResponse> {
  return authorizedJson<VideoPlaybackResponse>(
    `${API_URL}/api/mobile/videos/${videoId}/playback`,
    token,
  );
}

export function recordVideoView(token: string, videoId: number): Promise<{
  success: true;
  data: { video_id: number; total_views: number; unique_viewers: number };
}> {
  return authorizedJson(
    `${API_URL}/api/mobile/videos/${videoId}/view`,
    token,
    { method: "POST" },
  );
}

export function updateVideo(
  token: string,
  videoId: number,
  input: { title: string; description: string },
): Promise<VideoResponse> {
  return authorizedJson<VideoResponse>(
    `${API_URL}/api/mobile/videos/${videoId}`,
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function deleteVideo(token: string, videoId: number): Promise<{ success: true }> {
  return authorizedJson<{ success: true }>(
    `${API_URL}/api/mobile/videos/${videoId}`,
    token,
    { method: "DELETE" },
  );
}

export function deleteAllVideos(token: string): Promise<{ success: true; data: { deleted: number; failed: number } }> {
  return authorizedJson<{ success: true; data: { deleted: number; failed: number } }>(
    `${API_URL}/api/mobile/videos`,
    token,
    { method: "DELETE" },
  );
}

export function getVideoEnhancementOptions(token: string, videoId: number): Promise<VideoEnhancementOptionsResponse> {
  return authorizedJson(`${API_URL}/api/mobile/videos/${videoId}/enhancement-options`, token);
}

export function startVideoEnhancement(token: string, videoId: number, method: VideoEnhancementMethod, targetShortSide: VideoEnhancementTargetShortSide, mode: VideoEnhancementMode, idempotencyKey: string): Promise<VideoEnhancementJobResponse> {
  return authorizedJson(`${API_URL}/api/mobile/videos/${videoId}/enhancements`, token, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ mode, method, target_short_side: targetShortSide, fallback_policy: "none", idempotency_key: idempotencyKey }),
  });
}

export function getVideoEnhancementStatus(token: string, videoId: number, jobId: string): Promise<VideoEnhancementJobResponse> {
  return authorizedJson(`${API_URL}/api/mobile/videos/${videoId}/enhancements/${jobId}`, token);
}

export function cancelVideoEnhancement(token: string, videoId: number, jobId: string): Promise<VideoEnhancementJobResponse> {
  return authorizedJson(`${API_URL}/api/mobile/videos/${videoId}/enhancements/${jobId}`, token, { method: "DELETE" });
}

export function selectVideoEnhancementVersion(token: string, videoId: number, jobId: string, version: "original" | "enhanced"): Promise<{ success: true; data: { selected_version: string; playback_url: string } }> {
  return authorizedJson(`${API_URL}/api/mobile/videos/${videoId}/enhancements/${jobId}/select`, token, { method: "POST", body: JSON.stringify({ version }) });
}
