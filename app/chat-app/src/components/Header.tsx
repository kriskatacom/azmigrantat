import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface HeaderProps {
  hideSearchButton?: boolean;
  hideAuthButton?: boolean;
  title?: string;
  subtitle?: string;
  brandTitle?: string;
  showBackButton?: boolean;
  showNotificationsButton?: boolean;
  notificationCount?: number;
  actions?: ReactNode;
}

export default function Header({
  hideSearchButton = false,
  hideAuthButton = false,
  title,
  subtitle,
  brandTitle,
  showBackButton = true,
  showNotificationsButton = false,
  notificationCount = 0,
  actions,
}: HeaderProps) {
  const router = useRouter();
  const canGoBack = router.canGoBack();
  const headerBackground = "#111827";
  const headerForeground = "#ffffff";
  const headerSecondary = "#d1d5db";

  return (
    <>
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: headerBackground,
            borderBottomColor: "#273244",
          },
        ]}
      >
        <View style={styles.brandBlock}>
          <Image
            source={require("../../assets/images/logo-dark.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          {brandTitle ? (
            <Text style={[styles.brandTitle, { color: headerForeground }]} numberOfLines={2}>
              {brandTitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          {!hideSearchButton && (
            <TouchableOpacity
              onPress={() => router.push("/search")}
              style={[
                styles.headerIconButton,
                {
                  backgroundColor: "transparent",
                  borderColor: "#374151",
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Търсене на постове"
            >
              <FontAwesome name="search" size={24} color={headerForeground} />
            </TouchableOpacity>
          )}

          {showNotificationsButton && (
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              style={[
                styles.headerIconButton,
                {
                  backgroundColor: "transparent",
                  borderColor: "#374151",
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                notificationCount > 0
                  ? `Известия, ${notificationCount} непрочетени`
                  : "Известия"
              }
            >
              <FontAwesome name="bell" size={22} color={headerForeground} />
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
                  backgroundColor: "transparent",
                  borderColor: "#374151",
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Вход"
            >
              <FontAwesome name="user" size={24} color={headerForeground} />
            </TouchableOpacity>
          )}

          {actions}
        </View>
      </View>

      <View
        style={[
          styles.header,
          {
            backgroundColor: headerBackground,
            borderBottomColor: "#273244",
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
              color={headerForeground}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}

        <View style={styles.titleBlock}>
          <Text
            style={[
              styles.title,
              {
                color: headerForeground,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: headerSecondary }]}
              numberOfLines={3}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

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
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
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
  titleBlock: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  subtitle: {
    maxWidth: "100%",
    fontSize: 12,
    lineHeight: 16,
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
    width: 108,
    height: 54,
    marginRight: 4,
  },
  brandTitle: {
    maxWidth: 220,
    fontSize: 17,
    fontWeight: "800",
    flexShrink: 1,
  },
  headerIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
    borderWidth: 1,
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
