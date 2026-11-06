import * as SecureStore from "expo-secure-store";
import { uploadFingerprint } from "./video-upload-policy";

export type PreviousUpload = {
  size: number | null;
  metadata: Record<string, string>;
  creationTime: string;
  urlStorageKey: string;
  uploadUrl: string | null;
  parallelUploadUrls: string[] | null;
};

export type UrlStorage = {
  findAllUploads(): Promise<PreviousUpload[]>;
  findUploadsByFingerprint(fingerprint: string): Promise<PreviousUpload[]>;
  removeUpload(urlStorageKey: string): Promise<void>;
  addUpload(fingerprint: string, upload: PreviousUpload): Promise<string>;
};

const keyFor = (fingerprint: string) => `azmigrantat.tus.${encodeURIComponent(fingerprint)}`;

/** Stores only resumable TUS URLs in the device keychain; upload tokens are never persisted. */
export class SecureTusUrlStorage implements UrlStorage {
  async findAllUploads(): Promise<PreviousUpload[]> {
    return [];
  }

  async findUploadsByFingerprint(fingerprint: string): Promise<PreviousUpload[]> {
    const key = keyFor(fingerprint);
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return [];
    try {
      const upload = JSON.parse(raw) as PreviousUpload;
      return [{ ...upload, urlStorageKey: key }];
    } catch {
      await SecureStore.deleteItemAsync(key);
      return [];
    }
  }

  async removeUpload(urlStorageKey: string): Promise<void> {
    if (urlStorageKey.startsWith("azmigrantat.tus.")) await SecureStore.deleteItemAsync(urlStorageKey);
  }

  async addUpload(fingerprint: string, upload: PreviousUpload): Promise<string> {
    const key = keyFor(fingerprint);
    await SecureStore.setItemAsync(key, JSON.stringify(upload));
    return key;
  }
}

export function dedicatedTusFingerprint(userId: number, videoId: number, uploadId: string, fileUri: string, fileSize: number): string {
  return uploadFingerprint(userId, videoId, uploadId, fileUri, fileSize);
}
