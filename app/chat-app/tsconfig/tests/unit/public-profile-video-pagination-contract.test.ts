import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicProfileScreen = readFileSync("../src/app/user/[id].tsx", "utf8");

describe("public profile video pagination contract", () => {
  it("loads subsequent video pages inside the public profile", () => {
    expect(publicProfileScreen).toContain("const PROFILE_VIDEO_PAGE_SIZE = 10");
    expect(publicProfileScreen).toContain("const loadMoreVideos = useCallback");
    expect(publicProfileScreen).toContain("videosPage: nextPage");
    expect(publicProfileScreen).toContain("void loadMoreVideos()");
  });

  it("does not render the legacy view-all-videos button", () => {
    expect(publicProfileScreen).not.toContain("Преглед на всички видеоклипове");
    expect(publicProfileScreen).not.toContain("onViewAll");
  });
});
