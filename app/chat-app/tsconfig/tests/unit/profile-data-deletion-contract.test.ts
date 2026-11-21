import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicProfile = readFileSync("../src/app/user/[id].tsx", "utf8");
const privateProfile = readFileSync("../src/app/(profile)/index.tsx", "utf8");
const deletionHub = readFileSync("../src/app/(profile)/data-deletion.tsx", "utf8");
const deleteVideosScreen = readFileSync("../src/app/(profile)/delete-videos.tsx", "utf8");

describe("private profile data deletion contract", () => {
  it("removes bulk video deletion from the public profile", () => {
    expect(publicProfile).not.toContain("deleteAllVideos");
    expect(publicProfile).not.toContain("Изтрий всички видеоклипове");
  });

  it("places one data deletion section at the bottom of the private profile options", () => {
    expect(privateProfile).toContain('href="/(profile)/data-deletion"');
    expect(privateProfile).toContain('title="Изтриване на данни"');
    expect(privateProfile).not.toContain('href="/(profile)/messages"');
    expect(privateProfile).not.toContain('href="/(profile)/delete-account"');
  });

  it("exposes message, video, and account deletion from the deletion hub", () => {
    expect(deletionHub).toContain('href="/(profile)/messages"');
    expect(deletionHub).toContain('href="/(profile)/delete-videos"');
    expect(deletionHub).toContain('href="/(profile)/delete-account"');
    expect(deleteVideosScreen).toContain("deleteAllVideos(token)");
    expect(deleteVideosScreen).toContain("<ConfirmModal");
  });
});
