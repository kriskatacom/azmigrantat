import { darkTheme, lightTheme, type AppTheme } from "@/constants/theme";
import {
  getAppearancePreference,
  loadUserSettings,
  setAppearancePreference,
  subscribeUserSettings,
  type AppearancePreference,
} from "@/services/user-settings";
import * as SystemUI from "expo-system-ui";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

type ColorScheme = "light" | "dark";

interface ThemeContextValue {
  colorScheme: ColorScheme;
  appearance: AppearancePreference;
  theme: AppTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: "light",
  appearance: "system",
  theme: lightTheme,
  toggleTheme: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

function resolveColorScheme(
  appearance: AppearancePreference,
  systemTheme: string | null | undefined,
): ColorScheme {
  if (appearance === "light" || appearance === "dark") {
    return appearance;
  }

  return systemTheme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const [appearance, setAppearance] = useState<AppearancePreference>(
    getAppearancePreference,
  );

  useEffect(() => {
    void loadUserSettings();
    return subscribeUserSettings(() => {
      setAppearance(getAppearancePreference());
    });
  }, []);

  const colorScheme = resolveColorScheme(appearance, systemTheme);
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  const toggleTheme = useCallback(() => {
    void setAppearancePreference(colorScheme === "dark" ? "light" : "dark");
  }, [colorScheme]);

  const contextValue = useMemo(
    () => ({
      colorScheme,
      appearance,
      theme,
      toggleTheme,
    }),
    [appearance, colorScheme, theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
