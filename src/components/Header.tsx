import { useAppTheme } from "@/app/_layout";
import { FontAwesome } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Header() {
  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme === "dark";

  return (
    <View
      style={[
        styles.headerContainer,
        isDark ? styles.darkHeader : styles.lightHeader,
      ]}
    >
      <Text style={[styles.title, isDark ? styles.darkText : styles.lightText]}>
        Аз мигрантът
      </Text>

      <TouchableOpacity
        onPress={toggleTheme}
        style={[
          styles.themeButton,
          isDark ? styles.darkButton : styles.lightButton,
        ]}
      >
        {isDark ? (
          <FontAwesome name="sun-o" size={28} color="#f59e0b" />
        ) : (
          <FontAwesome name="moon-o" size={28} color="#4b5563" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: "100%",
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  lightHeader: {
    backgroundColor: "#ffffff",
    borderBottomColor: "#e4e4e7",
  },
  darkHeader: {
    backgroundColor: "#18181b",
    borderBottomColor: "#27272a",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  lightText: {
    color: "#09090b",
  },
  darkText: {
    color: "#ffffff",
  },
  themeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  lightButton: {
    backgroundColor: "#f4f4f5",
  },
  darkButton: {
    backgroundColor: "#27272a",
  },
});
