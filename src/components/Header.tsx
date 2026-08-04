import { useAppTheme } from "@/app/_layout";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface HeaderProps {
  hideSearchButton?: boolean;
  hideAuthButton?: boolean;
  title?: string;
  showBackButton?: boolean;
}

export default function Header({
  hideSearchButton = false,
  hideAuthButton = false,
  title,
  showBackButton = true,
}: HeaderProps) {
  const { theme } = useAppTheme();
  const router = useRouter();

  return (
    <>
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <Image
          source={require("../../assets/images/azmigrantat-logo.webp")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.headerActions}>
          {!hideSearchButton && (
            <TouchableOpacity
              onPress={() => router.push("/search")}
              style={[
                styles.headerIconButton,
                {
                  backgroundColor: theme.colors.background,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Търсене на постове"
            >
              <FontAwesome name="search" size={24} color={theme.colors.icon} />
            </TouchableOpacity>
          )}

          {!hideAuthButton && (
            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              style={[
                styles.headerIconButton,
                {
                  backgroundColor: theme.colors.background,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Вход"
            >
              <FontAwesome name="user" size={24} color={theme.colors.icon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
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
              color={theme.colors.text}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}

        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text,
            },
          ]}
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
  headerActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  logo: {
    width: 50,
    height: 50,
  },
  headerIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
});
