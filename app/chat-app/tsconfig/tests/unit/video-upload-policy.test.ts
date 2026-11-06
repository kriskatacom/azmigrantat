import { describe, expect, it } from "vitest";
import { isDedicatedUpload, isExpiredUploadStatus, shouldRetryTusStatus, uploadFingerprint } from "../../../src/services/video-upload-policy";

describe("provider-neutral upload policy", () => {
  it("distinguishes Dedicated sessions without changing Bunny credentials", () => {
    expect(isDedicatedUpload({ provider: "oneprovider", endpoint: "https://video.example/upload", upload_id: "u", user_id: 7, video_id: 9, authorization_token: "secret", tus_resumable: "1.0.0" })).toBe(true);
    expect(isDedicatedUpload({ endpoint: "https://video.bunnycdn.com/tusupload", library_id: 1, video_id: "guid", authorization_signature: "sig", authorization_expire: 123 })).toBe(false);
  });

  it("does not retry expired or unauthorized tokens", () => {
    expect(isExpiredUploadStatus(401)).toBe(true);
    expect(isExpiredUploadStatus(403)).toBe(true);
    expect(shouldRetryTusStatus(401)).toBe(false);
    expect(shouldRetryTusStatus(500)).toBe(true);
    expect(shouldRetryTusStatus(0)).toBe(true);
  });

  it("creates an owner- and upload-specific resume fingerprint", () => {
    const first = uploadFingerprint(7, 9, "upload-a", "file:///clip.mp4", 100);
    expect(first).toContain("oneprovider:7:9:upload-a:100:");
    expect(first).not.toBe(uploadFingerprint(8, 9, "upload-a", "file:///clip.mp4", 100));
  });
});
