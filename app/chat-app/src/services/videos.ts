import { authorizedJson } from "@/services/session-http";
import type {
  BeginVideoUploadResponse,
  BunnyUploadCredentials,
  VideoResponse,
  VideosResponse,
  VideoPlaybackResponse,
} from "@/types/video";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { Platform } from "react-native";
import * as tus from "tus-js-client";
import BunnyNativeUpload, { cancelNativeUpload } from "../../modules/my-module/src/BunnyNativeUploadModule";
import type { BunnyUploadProgressEvent } from "../../modules/my-module/src/BunnyNativeUpload.types";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
let activeNativeUploadId: string | null = null;

if (!API_URL) {
  throw new Error("Липсва EXPO_PUBLIC_API_URL.");
}

export function beginVideoUpload(
  token: string,
  input: { title: string; description: string; filename: string; mimeType: string; fileSize: number },
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
  credentials: BunnyUploadCredentials,
  onProgress: (percentage: number) => void,
  options?: { cancelUrl?: string; authToken?: string },
): Promise<void> {
  if (Platform.OS === "android") {
    return uploadVideoWithNative(file, credentials, onProgress, options);
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

export function listVideos(token: string): Promise<VideosResponse> {
  return authorizedJson<VideosResponse>(`${API_URL}/api/mobile/videos`, token);
}

export function getVideoPlayback(token: string, videoId: number): Promise<VideoPlaybackResponse> {
  return authorizedJson<VideoPlaybackResponse>(
    `${API_URL}/api/mobile/videos/${videoId}/playback`,
    token,
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
