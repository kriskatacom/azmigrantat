import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const { theme } = useAppTheme();
  const isDark = theme === "dark";

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <Header />

      <View style={styles.content}>
        <Text
          style={[styles.title, isDark ? styles.darkText : styles.lightText]}
        >
          Добре дошъл! 👋
        </Text>
        <Text
          style={[
            styles.subtitle,
            isDark ? styles.darkSubText : styles.lightSubText,
          ]}
        >
          Приложението се зарежда със системната тема на твоя телефон, но можеш
          временно да я променяш от бутона горе!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightBg: {
    backgroundColor: "#fafafa",
  },
  darkBg: {
    backgroundColor: "#09090b",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 26,
  },
  lightText: {
    color: "#09090b",
  },
  darkText: {
    color: "#ffffff",
  },
  lightSubText: {
    color: "#71717a",
  },
  darkSubText: {
    color: "#a1a1aa",
  },
});
