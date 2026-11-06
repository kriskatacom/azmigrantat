import { beforeEach, describe, expect, it, vi } from "vitest";

const secureValues = new Map<string, string>();
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => secureValues.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { secureValues.set(key, value); }),
  deleteItemAsync: vi.fn(async (key: string) => { secureValues.delete(key); }),
}));

import { SecureTusUrlStorage } from "../../../src/services/dedicated-tus-storage";
import { clearPendingVideoUpload, getPendingVideoUpload, savePendingVideoUpload } from "../../../src/services/video-upload-state";

describe("Dedicated TUS URL storage", () => {
  beforeEach(() => secureValues.clear());

  it("persists a resumable URL and removes it after success", async () => {
    const storage = new SecureTusUrlStorage();
    const upload = {
      size: 100,
      metadata: { filename: "clip.mp4" },
      creationTime: new Date().toISOString(),
      urlStorageKey: "",
      uploadUrl: "https://video.example/uploads/u1",
      parallelUploadUrls: null,
    };
    const key = await storage.addUpload("oneprovider:7:9:u1:100:file", upload);
    const found = await storage.findUploadsByFingerprint("oneprovider:7:9:u1:100:file");
    expect(found).toHaveLength(1);
    expect(found[0].uploadUrl).toBe(upload.uploadUrl);
    expect(found[0].urlStorageKey).toBe(key);
    await storage.removeUpload(key);
    await expect(storage.findUploadsByFingerprint("oneprovider:7:9:u1:100:file")).resolves.toEqual([]);
  });

  it("does not share a resume URL between different fingerprints", async () => {
    const storage = new SecureTusUrlStorage();
    await storage.addUpload("oneprovider:7:9:u1:100:file", {
      size: 100,
      metadata: {},
      creationTime: new Date().toISOString(),
      urlStorageKey: "",
      uploadUrl: "https://video.example/uploads/u1",
      parallelUploadUrls: null,
    });
    await expect(storage.findUploadsByFingerprint("oneprovider:8:9:u1:100:file")).resolves.toEqual([]);
  });

  it("isolates pending upload state by account and clears it explicitly", async () => {
    await savePendingVideoUpload({ userId: 7, videoId: 9, provider: "oneprovider", uploadId: "u1", fileUri: "file:///clip.mp4", fileSize: 100, mimeType: "video/mp4", filename: "clip.mp4" });
    await expect(getPendingVideoUpload(8, "file:///clip.mp4", 100)).resolves.toBeNull();
    await expect(getPendingVideoUpload(7, "file:///clip.mp4", 100)).resolves.toMatchObject({ videoId: 9 });
    await clearPendingVideoUpload(7);
    await expect(getPendingVideoUpload(7, "file:///clip.mp4", 100)).resolves.toBeNull();
  });
});
