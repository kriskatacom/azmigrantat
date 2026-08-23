import { useAppTheme } from "@/app/_layout";
import { useUnreadMessageCount } from "@/hooks/chat/useUnreadMessageCount";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { isAuthenticated, user } = useAuth();
  const unreadMessageCount = useUnreadMessageCount();
  const unreadNotificationCount = useUnreadNotificationCount();

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#030714" />

      <ImageBackground
        source={require("../../assets/images/background.jpg")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.topPill, styles.livePill]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.topPill}>
            <Ionicons name="eye-outline" size={22} color="#ffffff" />
            <Text style={styles.topPillText}>Виж повече</Text>
          </TouchableOpacity>

          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => router.push("/notifications")}
              accessibilityRole="button"
              accessibilityLabel={
                unreadNotificationCount > 0
                  ? `Известия, ${unreadNotificationCount} непрочетени`
                  : "Известия"
              }
            >
              <Ionicons name="notifications-outline" size={28} color="#ffffff" />
              {isAuthenticated && unreadNotificationCount > 0 ? (
                <View style={styles.topBadge}>
                  <Text style={styles.topBadgeText}>
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => router.push("/search")}
            >
              <Ionicons name="search-outline" size={31} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/inbox")}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={26}
              color="#ffffff"
            />
            <Text style={styles.actionLabel}>Чат</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="mic-outline" size={30} color="#ffffff" />
            <Text style={styles.actionLabel}>Аудио</Text>
          </TouchableOpacity>

        </View>

        <View style={styles.bottomNavigation}>
          <NavigationItem
            icon="home"
            label="Начало"
            active
            onPress={() => router.push("/")}
          />

          <NavigationItem
            icon="grid-outline"
            label="Категории"
            onPress={() => {}}
          />

          <TouchableOpacity style={styles.uploadItem}>
            <View style={styles.uploadCircle}>
              <Ionicons name="add" size={50} color="#103445" />
            </View>
            <Text style={styles.uploadLabel}>Качи</Text>
          </TouchableOpacity>

          <NavigationItem
            icon="chatbubble-ellipses-outline"
            label="Входящи"
            badgeCount={isAuthenticated ? unreadMessageCount : 0}
            onPress={() => router.push("/inbox")}
          />

          <NavigationItem
            icon="person-outline"
            label="Профил"
            onPress={() => {
              if (isAuthenticated && user?.id) {
                router.push({
                  pathname: "/user/[id]",
                  params: { id: String(user.id) },
                });
                return;
              }

              router.push("/(auth)/login");
            }}
          />
        </View>
      </ImageBackground>
    </View>
  );
}

type NavigationItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  badgeCount?: number;
  onPress: () => void;
};

function NavigationItem({
  icon,
  label,
  active = false,
  badgeCount = 0,
  onPress,
}: NavigationItemProps) {
  return (
    <TouchableOpacity
      style={styles.navigationItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        badgeCount > 0 ? `${label}, ${badgeCount} непрочетени съобщения` : label
      }
    >
      <View style={styles.navigationIcon}>
        <Ionicons
          name={icon}
          size={29}
          color={active ? "#E8E296" : "#a1a1aa"}
        />
        {badgeCount > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[styles.navigationLabel, active && styles.navigationLabelActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#030714",
  },
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.12)",
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    minHeight: 120,
    paddingHorizontal: 18,
    paddingTop: 50,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(2, 6, 23, 0.94)",
  },
  topPill: {
    height: 35,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  livePill: {
    borderColor: "#E8E296",
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E8E296",
  },
  liveText: {
    color: "#E8E296",
    fontSize: 12,
    fontWeight: "800",
  },
  topPillText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "600",
  },
  searchButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
  },
  topRightActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
  },
  topBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    borderWidth: 2,
    borderColor: "#030718",
    alignItems: "center",
    justifyContent: "center",
  },
  topBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  centerBrand: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 150,
  },
  quickActions: {
    position: "absolute",
    right: 24,
    bottom: 182,
    gap: 14,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 46,
    backgroundColor: "rgba(2, 8, 30, 0.93)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.24)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  actionLabel: {
    color: "#ffffff",
    fontSize: 10,
    marginTop: 2,
  },
  bottomNavigation: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
    paddingHorizontal: 10,
    paddingBottom: 60,
    backgroundColor: "rgba(3, 7, 24, 0.97)",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    elevation: 14,
  },
  navigationItem: {
    width: "18%",
    height: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  navigationLabel: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 7,
  },
  navigationLabelActive: {
    color: "#E8E296",
  },
  navigationIcon: {
    position: "relative",
  },
  unreadBadge: {
    position: "absolute",
    top: -9,
    right: -16,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    borderWidth: 2,
    borderColor: "#030718",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  uploadItem: {
    width: "20%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  uploadCircle: {
    width: 60,
    height: 60,
    borderRadius: 42,
    marginBottom: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8E296",
    shadowColor: "#334C54",
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
  },
  uploadLabel: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "700",
  },
});
