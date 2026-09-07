import { useAppTheme } from "@/app/_layout";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface HeaderProps {
  hideSearchButton?: boolean;
  hideAuthButton?: boolean;
  title?: string;
  showBackButton?: boolean;
  showNotificationsButton?: boolean;
  notificationCount?: number;
  actions?: ReactNode;
}

export default function Header({
  hideSearchButton = false,
  hideAuthButton = false,
  title,
  showBackButton = true,
  showNotificationsButton = false,
  notificationCount = 0,
  actions,
}: HeaderProps) {
  const { theme } = useAppTheme();
  const router = useRouter();
  const canGoBack = router.canGoBack();

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
          source={require("../../assets/images/eto-me.png")}
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

          {showNotificationsButton && (
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              style={[
                styles.headerIconButton,
                {
                  backgroundColor: theme.colors.background,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                notificationCount > 0
                  ? `Известия, ${notificationCount} непрочетени`
                  : "Известия"
              }
            >
              <FontAwesome name="bell" size={22} color={theme.colors.icon} />
              {notificationCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </Text>
                </View>
              ) : null}
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

          {actions}
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
            onPress={() => {
              if (canGoBack) {
                router.back();
                return;
              }

              router.replace("/");
            }}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={canGoBack ? "Назад" : "Начало"}
          >
            <FontAwesome
              name={canGoBack ? "chevron-left" : "home"}
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
    overflow: "visible",
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
    overflow: "visible",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
});
