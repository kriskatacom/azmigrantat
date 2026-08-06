import { darkTheme, lightTheme, type AppTheme } from "@/constants/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { Stack } from "expo-router";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import "../../global.css";

type ColorScheme = "light" | "dark";

interface ThemeContextValue {
  colorScheme: ColorScheme;
  theme: AppTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: "light",
  theme: lightTheme,
  toggleTheme: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();

  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    systemTheme === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    if (systemTheme === "light" || systemTheme === "dark") {
      setColorScheme(systemTheme);
    }
  }, [systemTheme]);

  const toggleTheme = () => {
    setColorScheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  const contextValue = useMemo(
    () => ({
      colorScheme,
      theme,
      toggleTheme,
    }),
    [colorScheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
