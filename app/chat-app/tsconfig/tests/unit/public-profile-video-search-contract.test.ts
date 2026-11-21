import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicProfile = readFileSync("../src/app/user/[id].tsx", "utf8");
const profileService = readFileSync("../src/services/profile.ts", "utf8");
const userController = readFileSync(
  "../../../auth/app/Controllers/Api/UserController.php",
  "utf8",
);

describe("public profile video search contract", () => {
  it("renders video-only search above profile video statistics", () => {
    const searchIndex = publicProfile.indexOf("<TextInput");
    const statsIndex = publicProfile.indexOf("<VideoStatsCard");

    expect(searchIndex).toBeGreaterThan(-1);
    expect(statsIndex).toBeGreaterThan(searchIndex);
    expect(publicProfile).toContain("Търсене по заглавие или описание");
  });

  it("sends the active search through every paginated video request", () => {
    expect(profileService).toContain('params.set("videos_search", options.videosSearch)');
    expect(publicProfile).toContain("videosSearch: normalizedSearch");
    expect(publicProfile).toContain("videosSearch: requestedSearch");
    expect(profileService).toContain("signal?: AbortSignal");
    expect(publicProfile).toContain("controller.abort()");
  });

  it("pauses infinite scrolling as soon as the search text changes", () => {
    expect(publicProfile).toContain("isSearchingVideosRef.current = shouldSearch");
    expect(publicProfile).toContain("|| isSearchingVideosRef.current");
    expect(publicProfile).toContain("}, [token, userId, videoSearch]);");
  });

  it("shows database results immediately below the search field", () => {
    expect(publicProfile).not.toContain("videoMatchesSearch");
    expect(publicProfile).not.toContain("loadedProfileVideosRef");
    expect(publicProfile).toContain("{ ...current, videos: [] }");
    expect(publicProfile).toContain("videos: response.videos ?? []");
    expect(publicProfile).toContain("{hasSearch ? videoResults : null}");
    expect(publicProfile).toContain("{!hasSearch ? videoResults : null}");
  });

  it("keeps the bottom of the video list clear of the keyboard and safe area", () => {
    expect(publicProfile).toContain("automaticallyAdjustKeyboardInsets");
    expect(publicProfile).toContain('keyboardShouldPersistTaps="handled"');
    expect(publicProfile).toContain("paddingBottom: Math.max(64, insets.bottom + 64)");
  });

  it("filters the profile video query by title and description", () => {
    expect(userController).toContain("\$_GET['videos_search']");
    expect(userController).toContain("->where('title', 'LIKE'");
    expect(userController).toContain("->orWhere('description', 'LIKE'");
    expect(userController).toContain("$videoSearchTerms");
    expect(userController).toContain("if ($videoSearch === '') {");
    expect(userController).toContain("$this->removeMissingBunnyVideos");
  });
});
