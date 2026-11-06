import { describe, expect, it } from "vitest";
import {
  processingTimeoutMessage,
  shouldLogVideoStatus,
  VIDEO_PROCESSING_MAX_WAIT_MS,
  VIDEO_PROCESSING_POLL_INTERVAL_MS,
} from "../../../src/services/video-processing-polling";

describe("video processing polling", () => {
  it("logs only status transitions for a video id", () => {
    expect(shouldLogVideoStatus(null, "processing")).toBe(true);
    expect(shouldLogVideoStatus("processing", "processing")).toBe(false);
    expect(shouldLogVideoStatus("processing", "ready")).toBe(true);
  });

  it("uses a bounded wait without converting a timeout into failed", () => {
    expect(VIDEO_PROCESSING_POLL_INTERVAL_MS).toBe(3000);
    expect(VIDEO_PROCESSING_MAX_WAIT_MS).toBe(5 * 60 * 1000);
    expect(processingTimeoutMessage()).toContain("прекалено дълго");
  });
});
