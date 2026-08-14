export type LocationKind = "country" | "city";

export interface LocationSuggestion {
  id: string;
  name: string;
  displayName: string;
  countryCode?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  name?: string;
  address?: {
    country?: string;
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function searchLocations(
  query: string,
  kind: LocationKind,
  countryCode?: string,
  signal?: AbortSignal,
): Promise<LocationSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    featureType: kind,
    "accept-language": "bg,en",
  });
  if (kind === "city" && countryCode) params.set("countrycodes", countryCode);

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "bg,en;q=0.8",
      "User-Agent": "AzMigrantatChatApp/1.0 (mobile profile location search)",
    },
    signal,
  });
  if (!response.ok) throw new Error("Местоположенията не можаха да бъдат заредени.");

  const data = (await response.json()) as NominatimResult[];
  return data.map((item) => ({
    id: String(item.place_id),
    name:
      kind === "country"
        ? item.address?.country ?? item.name ?? item.display_name
        : item.address?.city ?? item.address?.town ?? item.address?.village ?? item.address?.municipality ?? item.name ?? item.display_name.split(",")[0],
    displayName: item.display_name,
    countryCode: item.address?.country_code,
  }));
}
