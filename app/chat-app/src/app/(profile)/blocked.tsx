import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import BlockUserSection from "@/components/profile/block-user-section";
import ConfirmModal from "@/components/ui/ConfirmModal";
import RemoteImage from "@/components/ui/RemoteImage";
import { useAuth } from "@/hooks/useAuth";
import { blockUserByCode, getBlockedUsers, unblockUser } from "@/services/profile";
import { playAppSound } from "@/services/sounds";
import type { BlockedUser } from "@/types/blocks";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function BlockedUsersScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pendingUnblock, setPendingUnblock] = useState<BlockedUser | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);

  const loadBlocked = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setBlocked([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        if (mode === "refresh") setIsRefreshing(true);
        else setIsLoading(true);

        const response = await getBlockedUsers(token, { limit: 30 });
        setBlocked(response.data);
        setHasMore(response.meta.has_more);
      } catch (error) {
        Alert.alert(
          "Грешка",
          error instanceof Error
            ? error.message
            : "Списъкът не можа да бъде зареден.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadBlocked("refresh");
    }, [loadBlocked]),
  );

  const loadMore = async () => {
    if (!token || !hasMore || isLoadingMore || blocked.length === 0) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const response = await getBlockedUsers(token, {
        limit: 30,
        beforeId: blocked[blocked.length - 1]?.id,
      });
      setBlocked((current) => [...current, ...response.data]);
      setHasMore(response.meta.has_more);
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Още записи не можаха да бъдат заредени.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleBlockUser = async (code: string) => {
    if (!token) {
      return false;
    }

    setIsBlocking(true);
    try {
      await blockUserByCode(token, code);
      playAppSound("blockUser");
      Alert.alert("Готово", "Потребителят беше блокиран.");
      await loadBlocked("refresh");
      return true;
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Потребителят не можа да бъде блокиран.",
      );
      return false;
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblock = async () => {
    if (!token || !pendingUnblock) {
      return;
    }

    const blockId = pendingUnblock.id;
    setPendingUnblock(null);
    try {
      await unblockUser(token, blockId);
      setBlocked((current) => current.filter((item) => item.id !== blockId));
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Потребителят не можа да бъде отблокиран.",
      );
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title="Блокирани потребители" hideSearchButton hideAuthButton />
      <FlatList
        data={blocked}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadBlocked("refresh")}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <BlockUserSection isBlocking={isBlocking} onBlock={handleBlockUser} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <FontAwesome
                name="ban"
                size={42}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                Няма блокирани потребители
              </Text>
              <Text
                style={[
                  styles.emptyDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Когато блокирате някого по код, той ще се появи тук.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator
              style={styles.footer}
              color={theme.colors.primary}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {item.profile_image ? (
              <RemoteImage uri={item.profile_image} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.placeholder,
                  { backgroundColor: theme.colors.background },
                ]}
              >
                <FontAwesome
                  name="user"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </View>
            )}
            <View style={styles.details}>
              <Text
                style={[styles.name, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {item.name ?? "Потребител"}
              </Text>
              {item.public_code ? (
                <Text
                  selectable
                  style={[styles.code, { color: theme.colors.textSecondary }]}
                >
                  {item.public_code}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setPendingUnblock(item)}
              style={[
                styles.unblock,
                { borderColor: theme.colors.primary },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Отблокирай ${item.name ?? "потребителя"}`}
            >
              <Text
                style={[styles.unblockText, { color: theme.colors.primary }]}
              >
                Отблокирай
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <ConfirmModal
        visible={pendingUnblock !== null}
        title="Отблокиране"
        message={`Да отблокирате ли ${pendingUnblock?.name ?? "този потребител"}?`}
        confirmText="Отблокирай"
        onConfirm={() => void handleUnblock()}
        onCancel={() => setPendingUnblock(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 20, gap: 10, paddingBottom: 40 },
  centered: { paddingVertical: 32, alignItems: "center" },
  empty: { alignItems: "center", paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 14, textAlign: "center" },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  details: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: "700" },
  code: { fontSize: 13, fontWeight: "600", letterSpacing: 0.6 },
  unblock: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  unblockText: { fontSize: 13, fontWeight: "700" },
  footer: { marginVertical: 16 },
});
