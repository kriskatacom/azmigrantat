import * as SecureStore from "expo-secure-store";

const LAST_ROUTE_KEY = "azmigrantat.navigation.last-route";
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export type PersistedNavigationRoute = {
  pathname: string;
  updatedAt: string;
};

export async function saveLastNavigationRoute(pathname: string): Promise<void> {
  const route: PersistedNavigationRoute = {
    pathname,
    updatedAt: new Date().toISOString(),
  };
  await SecureStore.setItemAsync(LAST_ROUTE_KEY, JSON.stringify(route), STORE_OPTIONS);
}

export async function loadLastNavigationRoute(): Promise<PersistedNavigationRoute | null> {
  const raw = await SecureStore.getItemAsync(LAST_ROUTE_KEY, STORE_OPTIONS);
  if (!raw) return null;

  try {
    const route = JSON.parse(raw) as PersistedNavigationRoute;
    if (
      typeof route.pathname !== "string" ||
      !route.pathname.startsWith("/") ||
      route.pathname.startsWith("//")
    ) {
      return null;
    }
    return route;
  } catch {
    return null;
  }
}

export async function clearLastNavigationRoute(): Promise<void> {
  await SecureStore.deleteItemAsync(LAST_ROUTE_KEY, STORE_OPTIONS);
}
