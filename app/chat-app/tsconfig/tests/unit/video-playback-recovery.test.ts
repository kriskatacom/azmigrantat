import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyVideoPlaybackError } from "../../../src/services/video-playback-errors";

const player = readFileSync("../src/components/video/controlled-video-player.tsx", "utf8");
const feed = readFileSync("../src/components/video/home-video-feed.tsx", "utf8");

describe("video playback recovery", () => {
  it("recognizes the native Expo Video 403 source error", () => {
    expect(classifyVideoPlaybackError({
      message: "A playback exception has occurred: Source error Response code: 403",
    })).toBe("forbidden");
    expect(classifyVideoPlaybackError({ message: "decoder failed" })).toBe("source_error");
  });

  it("does not expose the signed playback URL or raw native error in logs", () => {
    expect(player).not.toContain("console.error");
    expect(player).not.toMatch(/console\.(?:info|warn|error)[\s\S]{0,180}\burl\b/);
    expect(player).not.toMatch(/console\.(?:info|warn|error)[\s\S]{0,180}\berror\b/);
  });

  it("refreshes a forbidden URL with a bounded retry path", () => {
    expect(feed).toContain("getVideoPlayback(token, videoId)");
    expect(feed).toContain("PLAYBACK_REFRESH_THROTTLE_MS");
    expect(feed).toContain("currentState?.inFlight");
    expect(feed).toContain("onPlaybackError={handlePlaybackError}");
  });

  it("does not mute home videos for signed-out users", () => {
    expect(feed).not.toContain("muted={!token}");
    expect(feed.match(/muted=\{false\}/g)).toHaveLength(2);
  });
});
