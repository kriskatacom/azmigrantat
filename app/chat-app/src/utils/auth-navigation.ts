import type { Href } from "expo-router";

export const DEFAULT_AUTHENTICATED_ROUTE: Href = "/(profile)";

export function getSafeReturnTo(
  returnTo: string | string[] | undefined,
): Href {
  const destination = Array.isArray(returnTo) ? returnTo[0] : returnTo;

  if (
    !destination ||
    !destination.startsWith("/") ||
    destination.startsWith("//") ||
    destination.startsWith("/(auth)")
  ) {
    return DEFAULT_AUTHENTICATED_ROUTE;
  }

  return destination as Href;
}
