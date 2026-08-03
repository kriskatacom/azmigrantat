import { useAppTheme } from "@/app/_layout";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface HeaderProps {
  hideSearchButton?: boolean;
  title?: string;
  showBackButton?: boolean;
}

export default function Header({
  hideSearchButton = false,
  title,
  showBackButton = true,
}: HeaderProps) {
  const { theme } = useAppTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  return (
    <>
      <View
        style={[
          styles.headerContainer,
          isDark ? styles.darkHeader : styles.lightHeader,
        ]}
      >
        <Image
          source={require("../../assets/images/azmigrantat-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {!hideSearchButton && (
          <TouchableOpacity
            onPress={() => router.push("/search")}
            style={[
              styles.searchButton,
              isDark ? styles.darkButton : styles.lightButton,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Търсене на постове"
          >
            <FontAwesome
              name="search"
              size={24}
              color={isDark ? "#ffffff" : "#4b5563"}
            />
          </TouchableOpacity>
        )}
      </View>
      <View
        style={[styles.header, isDark ? styles.headerDark : styles.headerLight]}
      >
        {showBackButton ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            <FontAwesome
              name="chevron-left"
              size={20}
              color={isDark ? "#ffffff" : "#09090b"}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}

        <Text
          style={[styles.title, isDark ? styles.textDark : styles.textLight]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={styles.backButton} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 15,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerLight: {
    backgroundColor: "#ffffff",
    borderBottomColor: "#e4e4e7",
  },
  headerDark: {
    backgroundColor: "#18181b",
    borderBottomColor: "#27272a",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  textLight: {
    color: "#09090b",
  },
  textDark: {
    color: "#ffffff",
  },
  headerContainer: {
    width: "100%",
    paddingTop: 40,
    paddingBottom: 10,
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
  logo: {
    width: 50,
    height: 50,
  },
  searchButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
