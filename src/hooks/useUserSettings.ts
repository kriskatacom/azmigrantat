import {
  getUserSettings,
  subscribeUserSettings,
  type UserSettings,
} from "@/services/user-settings";
import { useEffect, useState } from "react";

export function useUserSettings(): UserSettings {
  const [value, setValue] = useState(getUserSettings);

  useEffect(() => {
    return subscribeUserSettings(() => {
      setValue(getUserSettings());
    });
  }, []);

  return value;
}
