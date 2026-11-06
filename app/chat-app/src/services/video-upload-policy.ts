import type { VideoUploadCredentials } from "@/types/video";

export function isDedicatedUpload(credentials: VideoUploadCredentials): boolean {
  return credentials.provider === "oneprovider";
}

export function isExpiredUploadStatus(status: number): boolean {
  return status === 401 || status === 403;
}

export function shouldRetryTusStatus(status: number): boolean {
  return status === 0 || status === 409 || status === 423 || status >= 500;
}

export function uploadFingerprint(userId: number, videoId: number, uploadId: string, fileUri: string, fileSize: number): string {
  return `oneprovider:${userId}:${videoId}:${uploadId}:${fileSize}:${fileUri}`;
}
