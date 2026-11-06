import * as SecureStore from "expo-secure-store";
import type { VideoStorageProvider } from "@/types/video";

export type PendingVideoUpload = {
  userId: number;
  videoId: number;
  provider: VideoStorageProvider;
  uploadId: string;
  fileUri: string;
  fileSize: number;
  mimeType: string;
  filename: string;
};

const stateKey = (userId: number) => `azmigrantat.video-upload.pending.${userId}`;

export async function savePendingVideoUpload(state: PendingVideoUpload): Promise<void> {
  await SecureStore.setItemAsync(stateKey(state.userId), JSON.stringify(state));
}

export async function getPendingVideoUpload(userId: number, fileUri: string, fileSize: number): Promise<PendingVideoUpload | null> {
  const raw = await SecureStore.getItemAsync(stateKey(userId));
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as PendingVideoUpload;
    if (state.userId !== userId || state.fileUri !== fileUri || state.fileSize !== fileSize) return null;
    if (!Number.isSafeInteger(state.videoId) || state.videoId < 1 || !state.uploadId) return null;
    return state;
  } catch {
    return null;
  }
}

export async function clearPendingVideoUpload(userId: number): Promise<void> {
  await SecureStore.deleteItemAsync(stateKey(userId));
}
