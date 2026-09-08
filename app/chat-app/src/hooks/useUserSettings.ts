import {
  getUserSettings,
  subscribeUserSettings,
  type UserSettings,
} from "@/services/user-settings";
import { useSyncExternalStore } from "react";

export function useUserSettings(): UserSettings {
  return useSyncExternalStore(
    subscribeUserSettings,
    getUserSettings,
    getUserSettings,
  );
}
