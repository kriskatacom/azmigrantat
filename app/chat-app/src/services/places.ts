import { parseJsonResponse } from "@/services/http-response";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) throw new Error("Липсва EXPO_PUBLIC_API_URL.");

export type PlaceType = "country" | "state" | "region" | "city" | "town" | "village" | "hamlet";

export type PlaceItem = {
  id: number;
  name: string;
  type: PlaceType;
  country_code: string | null;
  country: string | null;
  region: string | null;
  county: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  distance_km: number | null;
};

type PlacesResponse = { success: true; data: PlaceItem[]; attribution: string };

async function requestPlaces(path: string, signal?: AbortSignal): Promise<PlaceItem[]> {
  const response = await fetch(`${API_URL}${path}`, { signal, headers: { Accept: "application/json" } });
  const payload = await parseJsonResponse<PlacesResponse | { message?: string }>(response, "Невалиден отговор за населени места.");
  if (!response.ok || !("data" in payload)) {
    throw new Error("message" in payload && payload.message ? payload.message : "Населените места не могат да бъдат заредени.");
  }
  return payload.data;
}

export function searchPlaces(query: string, coordinates?: { latitude: number; longitude: number } | null, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query.trim() });
  if (coordinates) {
    params.set("lat", String(coordinates.latitude));
    params.set("lon", String(coordinates.longitude));
  }
  return requestPlaces(`/api/places/search?${params}`, signal);
}

export function getNearbyPlaces(latitude: number, longitude: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude) });
  return requestPlaces(`/api/places/nearby?${params}`, signal);
}

export function placeSubtitle(place: PlaceItem): string {
  return [place.city !== place.name ? place.city : null, place.region, place.country]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(", ");
}
