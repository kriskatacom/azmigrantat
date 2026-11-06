import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overlay = readFileSync(
  "../src/components/video/video-upload-progress-overlay.tsx",
  "utf8",
);

describe("video upload processing overlay", () => {
  it("hides the remaining-time block while processing", () => {
    expect(overlay).toContain('{stage !== "processing" ? (');
    expect(overlay).not.toContain('stage === "processing" || remainingSeconds === null');
  });

  it("centers the elapsed-time block while processing", () => {
    expect(overlay).toContain('stage === "processing" && styles.processingDetails');
    expect(overlay).toContain('processingDetails: { alignSelf: "stretch", justifyContent: "center" }');
  });
});
