import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("../../auth/database/migrations/20261111143000_create_places_and_add_video_place.php", "utf8");
const placeService = readFileSync("../../auth/app/Services/OpenStreetMapPlaceService.php", "utf8");
const placeController = readFileSync("../../auth/app/Controllers/Api/PlaceController.php", "utf8");
const videoController = readFileSync("../../auth/app/Controllers/Api/VideoController.php", "utf8");
const routes = readFileSync("../../auth/routes/web.php", "utf8");
const mobilePlaces = readFileSync("src/services/places.ts", "utf8");
const selector = readFileSync("src/components/location/place-selector.tsx", "utf8");
const upload = readFileSync("src/app/videos/upload.tsx", "utf8");
const categories = readFileSync("src/app/categories.tsx", "utf8");
const categoryVideos = readFileSync("src/app/category-videos.tsx", "utf8");

describe("video place discovery contract", () => {
  it("adds nullable place metadata without changing old videos", () => {
    expect(migration).toContain("->addColumn('place_id', 'integer', ['signed' => false, 'null' => true");
    expect(migration).toContain("'delete' => 'SET_NULL'");
    expect(videoController).toContain("$placeId = isset($input['place_id'])");
    expect(videoController).toContain("'place_id' => $placeId");
  });

  it("uses only public OpenStreetMap services behind a cached throttled proxy", () => {
    expect(placeService).toContain("https://photon.komoot.io");
    expect(placeService).toContain("/reverse?");
    expect(placeService).toContain("throttleUpstream");
    expect(placeService).toContain("etome-osm-");
    expect(placeService).not.toMatch(/google|mapbox|geoapify/i);
    expect(placeController).toContain("© OpenStreetMap contributors");
    expect(routes).toContain("/api/places/search");
    expect(routes).toContain("/api/places/nearby");
  });

  it("keeps GPS foreground-only and preserves text search when permission is denied", () => {
    expect(selector).toContain("requestForegroundPermissionsAsync");
    expect(selector).toContain("Location.Accuracy.High");
    expect(selector).not.toContain("startLocationUpdatesAsync");
    expect(selector).toContain("Можете да търсите по име");
    expect(selector).toContain("Най-близки населени места");
    expect(selector).toContain("© OpenStreetMap contributors");
    expect(mobilePlaces).toContain("query.trim()");
  });

  it("adds optional upload selection and leaf-only filtering", () => {
    expect(upload).toContain("<PlaceSelector value={selectedPlace}");
    expect(upload).toContain("place: selectedPlace");
    expect(categories).toContain("{leafCategoryId ? (");
    expect(categories).toContain("requestForegroundPermissionsAsync");
    expect(categories).toContain("loadNearbyAutomatically");
    expect(categories).toContain("Най-близки населени места");
    expect(categories).toContain('pathname: "/category-videos"');
    expect(categoryVideos).toContain("listPublicVideos(\"\", signal, categoryId, placeId)");
    expect(videoController).toContain("->when($place");
  });
});
