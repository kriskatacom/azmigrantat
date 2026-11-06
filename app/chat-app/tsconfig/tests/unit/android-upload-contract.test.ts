import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync("../modules/my-module/android/src/main/java/expo/modules/bunnynativeupload/BunnyUploadForegroundService.kt", "utf8");
const nativeModule = readFileSync("../modules/my-module/android/src/main/java/expo/modules/bunnynativeupload/BunnyNativeUploadModule.kt", "utf8");
const videoService = readFileSync("../src/services/videos.ts", "utf8");
const manifest = readFileSync("../modules/my-module/android/src/main/AndroidManifest.xml", "utf8");

describe("Android upload foreground contract", () => {
  it("declares Android 14 data-sync foreground service requirements", () => {
    expect(manifest).toContain("FOREGROUND_SERVICE_DATA_SYNC");
    expect(manifest).toContain('android:foregroundServiceType="dataSync"');
    expect(service).toContain("FOREGROUND_SERVICE_TYPE_DATA_SYNC");
    expect(service).toContain("PARTIAL_WAKE_LOCK");
  });

  it("keeps cancellation notification action and non-sticky process semantics explicit", () => {
    expect(service).toContain("Прекрати качването");
    expect(service).toContain("START_NOT_STICKY");
  });

  it("routes Dedicated Android uploads through the native TUS implementation", () => {
    expect(videoService).toContain("uploadVideoWithDedicatedNative");
    expect(nativeModule).toContain('Function("startDedicatedUpload")');
    expect(nativeModule).toContain('setRequestProperty("Authorization", "Bearer $authorizationToken")');
    expect(nativeModule).toContain('requestMethod = "HEAD"');
    expect(nativeModule).toContain('requestMethod = "PATCH"');
  });

  it("reconciles the server offset before retrying a potentially acknowledged chunk", () => {
    expect(nativeModule).toContain('if (error.status == 409)');
    expect(nativeModule).toContain('offset = headDedicated(uploadUrl, authorizationToken)');
    expect(nativeModule).toContain('if (offset > fileSize)');
  });

  it("rejects cross-origin redirects for Dedicated native uploads", () => {
    expect(nativeModule).toContain("instanceFollowRedirects = false");
    expect(nativeModule).toContain("resolveSameOriginUrl(endpoint, location)");
    expect(nativeModule).toContain('error("Upload session URL changed origin")');
    expect(videoService).toContain("assertDedicatedVideoUrl(credentials.endpoint)");
  });
});
