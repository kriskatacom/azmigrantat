import { Stack } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import "../../global.css";

const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

export default function Layout() {
  const systemTheme = useColorScheme();

  const initialTheme: "light" | "dark" =
    systemTheme === "dark" ? "dark" : "light";

  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);

  useEffect(() => {
    if (systemTheme === "light" || systemTheme === "dark") {
      setTheme(systemTheme);
    }
  }, [systemTheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </ThemeContext.Provider>
  );
}
