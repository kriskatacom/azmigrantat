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
import * as tus from "tus-js-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
): Promise<void> {
  return new Promise((resolve, reject) => {
    let displayedProgress = 0;
    const nativeFileSize = getNativeFileSize(file);

    // Expo's readable stream avoids the Android FileHandle readBytes limit that
    // can stop exactly at 48 MiB for larger picker files.
    const reader = file.readableStream().getReader();
    const upload = new tus.Upload(reader, {
      endpoint: credentials.endpoint,
      uploadSize: nativeFileSize,
      // 4 MB is a compromise between mobile reliability and request overhead:
      // fewer PATCH requests than 2 MB chunks, without the long lock window
      // that the original 8 MB chunks could create on weak connections.
      chunkSize: 4 * 1024 * 1024,
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
