import { describe, expect, it } from "vitest";
import { videoTimeForScrubPosition } from "../../../src/services/video-scrubber";

describe("video scrubber", () => {
  it("maps a dragged thumb position to the same percentage of the video", () => {
    expect(videoTimeForScrubPosition(75, 300, 120)).toBe(30);
    expect(videoTimeForScrubPosition(150, 300, 120)).toBe(60);
    expect(videoTimeForScrubPosition(225, 300, 120)).toBe(90);
  });

  it("clamps dragging before or after the track to the video boundaries", () => {
    expect(videoTimeForScrubPosition(-20, 300, 120)).toBe(0);
    expect(videoTimeForScrubPosition(340, 300, 120)).toBe(120);
  });

  it("does not seek until the track and video duration are known", () => {
    expect(videoTimeForScrubPosition(10, 0, 120)).toBeNull();
    expect(videoTimeForScrubPosition(10, 300, 0)).toBeNull();
  });
});
