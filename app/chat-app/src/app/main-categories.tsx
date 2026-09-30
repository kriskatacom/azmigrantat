import Header from "@/components/Header";
import RemoteImage from "@/components/ui/RemoteImage";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getRootCategories, type Category } from "@/services/categories";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function MainCategoriesScreen() {
  const { theme } = useAppTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async (refresh = false) => {
    setError(null);
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await getRootCategories();
      setCategories(response.items);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Категориите не можаха да се заредят.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const openCategoryLink = async (category: Category) => {
    const target = category.slug.trim();
    if (!target) return;

    try {
      await Linking.openURL(target);
    } catch (openError) {
      console.error("[MainCategories] Неуспешно отваряне на линка към категорията", {
        categoryId: category.id,
        target,
        error: openError,
      });
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: "Виж повече", headerShown: false }} />
      <Header title="Виж повече" hideSearchButton />

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>
            Зареждане на категориите...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.danger} />
          <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>{error}</Text>
          <Pressable
            onPress={() => void loadCategories()}
            style={[styles.retryButton, { backgroundColor: theme.colors.button }]}
          >
            <Text style={[styles.retryText, { color: theme.colors.buttonText }]}>Опитай отново</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadCategories(true)}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Text style={[styles.intro, { color: theme.colors.textSecondary }]}>Избери основна категория.</Text>

          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => void openCategoryLink(category)}
              style={({ pressed }) => [
                styles.categoryCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                pressed && { backgroundColor: theme.colors.input },
              ]}
              accessibilityRole="link"
              accessibilityLabel={`Отвори ${category.name}`}
            >
              <View style={styles.categoryCardRow}>
                {category.image_url ? (
                  <RemoteImage uri={category.image_url} style={styles.categoryImage} />
                ) : (
                  <View style={[styles.categoryIcon, { backgroundColor: theme.colors.primary }]}>
                    <Ionicons name="grid-outline" size={20} color={theme.colors.buttonText} />
                  </View>
                )}
                <View style={styles.categoryContent}>
                  <Text style={[styles.categoryName, { color: theme.colors.text }]} numberOfLines={2}>
                    {category.name}
                  </Text>
                  {category.description ? (
                    <Text
                      style={[styles.categoryDescription, { color: theme.colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {category.description}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.linkIcon, { borderColor: theme.colors.border }]}>
                  <Ionicons name="open-outline" size={18} color={theme.colors.textSecondary} />
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 20, gap: 12, paddingBottom: 40 },
  intro: { fontSize: 15, lineHeight: 21, marginBottom: 6 },
  categoryCard: { width: "100%", borderWidth: 1, borderRadius: 16, padding: 12 },
  categoryCardRow: { width: "100%", minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12 },
  categoryImage: { width: 58, height: 58, borderRadius: 29 },
  categoryIcon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  categoryContent: { flex: 1, gap: 3 },
  categoryName: { fontSize: 18, fontWeight: "800" },
  categoryDescription: { fontSize: 13, lineHeight: 17 },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  stateText: { fontSize: 15, lineHeight: 21, textAlign: "center" },
  retryButton: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 4 },
  retryText: { fontSize: 15, fontWeight: "600" },
});
