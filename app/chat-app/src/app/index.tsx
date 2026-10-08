import { useUnreadMessageCount } from "@/hooks/chat/useUnreadMessageCount";
import { useAuth } from "@/hooks/useAuth";
import HomeVideoFeed from "@/components/video/home-video-feed";
import RemoteImage from "@/components/ui/RemoteImage";
import type { PublicVideoItem } from "@/types/video";
import { getBackgroundUploadStatus, subscribeToBackgroundUpload } from "@/services/background-upload-state";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused, useRouter } from "expo-router";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from "react-native-svg";
import { useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { isAuthenticated, token, user } = useAuth();
  const isHomeVideoFeedDisabled =
    process.env.EXPO_PUBLIC_DISABLE_HOME_VIDEO_FEED === "true";
  const unreadMessageCount = useUnreadMessageCount();
  const [hasBackgroundUpload, setHasBackgroundUpload] = useState(getBackgroundUploadStatus().active);
  const [activeVideoUser, setActiveVideoUser] = useState<PublicVideoItem["user"]>(null);

  useEffect(() => subscribeToBackgroundUpload((status) => setHasBackgroundUpload(status.active)), []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground
        source={require("../../assets/images/background.jpg")}
        style={styles.background}
        resizeMode="cover"
      >
        {!isHomeVideoFeedDisabled ? (
          <HomeVideoFeed
            token={token}
            focused={isFocused}
            onActiveVideoUserChange={setActiveVideoUser}
          />
        ) : null}

        <View pointerEvents="none" style={styles.topGradient}>
          <Svg width="100%" height="100%">
            <Defs>
              <SvgLinearGradient id="homeTopGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="1" />
                <Stop offset="0.5" stopColor="#000000" stopOpacity="0.5" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#homeTopGradient)" />
          </Svg>
        </View>
        <View pointerEvents="none" style={styles.bottomGradient}>
          <Svg width="100%" height="100%">
            <Defs>
              <SvgLinearGradient id="homeBottomGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#000000" stopOpacity="0.5" />
                <Stop offset="1" stopColor="#000000" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#homeBottomGradient)" />
          </Svg>
        </View>

        <View style={styles.topBar}>
          <Image
            source={require("../../assets/images/logo-dark.png")}
            style={styles.homeLogo}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.liveIconButton}
            onPress={() => {
              if (isAuthenticated) {
                router.push("/live");
                return;
              }

              router.push({
                pathname: "/(auth)/login",
                params: { returnTo: "/live" },
              });
            }}
            accessibilityRole="button"
            accessibilityLabel="На живо"
          >
            <Ionicons name="radio-outline" size={25} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subscriptionButton}
            onPress={() => router.push("/main-categories")}
            accessibilityRole="button"
            accessibilityLabel="Отвори категориите"
          >
            <Ionicons name="grid-outline" size={17} color="#ffffff" />
            <Text style={styles.subscriptionButtonText}>Виж повече</Text>
          </TouchableOpacity>
          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => router.push("/search")}
            >
              <Ionicons name="search-outline" size={25} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {hasBackgroundUpload ? (
          <TouchableOpacity
            style={styles.backgroundUploadNotice}
            onPress={() => router.push("/videos/upload")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Покажи прогреса на качването"
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#E8E296" />
            <Text style={styles.backgroundUploadText}>
              Видеото се качва. Натиснете, за да видите прогреса.
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            disabled={!activeVideoUser}
            onPress={() => {
              if (!activeVideoUser) return;
              router.push({
                pathname: "/user/[id]",
                params: { id: String(activeVideoUser.id) },
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={
              activeVideoUser
                ? `Покажи профила на ${activeVideoUser.name}`
                : "Профил на автора на видеото"
            }
          >
            {activeVideoUser?.profile_image ? (
              <RemoteImage uri={activeVideoUser.profile_image} style={styles.videoAuthorAvatar} />
            ) : (
              <Ionicons name="person-outline" size={25} color="#ffffff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chatActionButton}
            onPress={() => router.push("/inbox")}
            accessibilityRole="button"
            accessibilityLabel="Чат"
          >
            <Image
              source={require("../../assets/images/chat.png")}
              style={styles.quickActionIcon}
              resizeMode="contain"
            />
            <Text style={styles.chatActionLabel}>Чат</Text>
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
            onPress={() => router.push("/categories")}
          />

          <TouchableOpacity
            style={styles.uploadItem}
            onPress={() => {
              if (isAuthenticated) {
                router.push("/videos/upload");
                return;
              }

              router.push({ pathname: "/(auth)/login", params: { returnTo: "/videos/upload" } });
            }}
          >
            <View style={styles.uploadCircle}>
              <Ionicons name="cloud-upload-outline" size={32} color="#ffffff" />
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
          size={24}
          color="#ffffff"
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
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    minHeight: 108,
    paddingHorizontal: 18,
    paddingTop: 46,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "transparent",
  },
  topPill: {
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  livePill: {
    borderColor: "#E8E296",
  },
  liveIconButton: {
    width: 40,
    height: 40,
    borderRadius: 0,
    paddingHorizontal: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  searchButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
  },
  homeLogo: {
    width: 102,
    height: 50,
    marginLeft: 2,
  },
  topRightActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
  },
  subscriptionButton: {
    height: 35,
    paddingHorizontal: 9,
    borderRadius: 18,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    marginRight: 4,
  },
  subscriptionButtonText: { color: "#ffffff", fontSize: 10, fontWeight: "900" },
  backgroundUploadNotice: {
    position: "absolute",
    top: 126,
    left: 16,
    right: 16,
    zIndex: 5,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(3, 7, 24, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(232, 226, 150, 0.55)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backgroundUploadText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
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
    borderWidth: 1,
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
    right: 18,
    bottom: 140,
    gap: 10,
    alignItems: "center",
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  chatActionButton: {
    width: 60,
    height: 60,
    marginTop: -8,
    borderRadius: 30,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionIcon: {
    width: 50,
    height: 50,
  },
  chatActionLabel: {
    position: "absolute",
    bottom: -14,
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  videoAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  bottomNavigation: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    paddingHorizontal: 10,
    paddingBottom: 52,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  navigationItem: {
    width: "18%",
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  navigationLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 7,
  },
  navigationLabelActive: {
    color: "#ffffff",
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
    width: 52,
    height: 52,
    borderRadius: 42,
    marginBottom: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  uploadLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    transform: [{ translateY: -10 }],
  },
});
