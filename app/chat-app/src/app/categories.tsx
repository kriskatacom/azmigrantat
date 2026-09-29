import Header from "@/components/Header";
import RemoteImage from "@/components/ui/RemoteImage";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getCategories, getRootCategories, type Category } from "@/services/categories";
import { listPublicVideos } from "@/services/videos";
import type { PublicVideoItem } from "@/types/video";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function CategoriesScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryPath, setCategoryPath] = useState<Category[]>([]);
  const [videos, setVideos] = useState<PublicVideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRootCategories = useCallback(async (refresh = false) => {
    setError(null);
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await getRootCategories();
      setCategories(response.items);
      setCategoryPath([]);
      setVideos([]);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Категориите не можаха да се заредят.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRootCategories();
  }, [loadRootCategories]);

  const openCategory = async (category: Category) => {
    setError(null);
    setIsLoadingVideos(true);
    try {
      const childrenResponse = await getCategories(category.id);
      const nextPath = [...categoryPath, category];

      if (childrenResponse.items.length > 0) {
        setCategoryPath(nextPath);
        setCategories(childrenResponse.items);
        setVideos([]);
        return;
      }

      const videoResponse = await listPublicVideos("", undefined, category.id);
      const categoryVideos = videoResponse.data.filter((video) => video.category_id === category.id);
      setCategoryPath(nextPath);
      setCategories([]);
      setVideos(categoryVideos);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Съдържанието не можа да се зареди.");
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const goBack = async () => {
    if (categoryPath.length === 0 || isLoadingVideos) return;
    setError(null);
    setIsLoadingVideos(true);
    try {
      const parentPath = categoryPath.slice(0, -1);
      const parentId = parentPath.length > 0 ? parentPath[parentPath.length - 1].id : null;
      const response = await getCategories(parentId);
      setCategoryPath(parentPath);
      setCategories(response.items);
      setVideos([]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Категориите не можаха да се заредят.");
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const openVideoAuthor = (video: PublicVideoItem) => {
    if (!video.user) return;
    router.push({
      pathname: "/user/[id]",
      params: { id: String(video.user.id), videoId: String(video.id) },
    });
  };

  const title = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1].name : "Категории";
  const parentPath = categoryPath.slice(0, -1).map((category) => category.name).join(" / ");

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <Header
        title={title}
        subtitle={parentPath || undefined}
        hideSearchButton
      />

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>Зареждане на категориите...</Text>
        </View>
      ) : error && categories.length === 0 && videos.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.danger} />
          <Text style={[styles.stateTitle, { color: theme.colors.text }]}>Неуспешно зареждане</Text>
          <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>{error}</Text>
          <Pressable onPress={() => void loadRootCategories()} style={[styles.retryButton, { backgroundColor: theme.colors.button }]}>
            <Text style={[styles.retryText, { color: theme.colors.buttonText }]}>Опитай отново</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.listContent, categories.length === 0 && videos.length === 0 ? styles.emptyListContent : null]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadRootCategories(true)} tintColor={theme.colors.primary} />}
        >
          {categoryPath.length > 0 ? (
            <Pressable onPress={() => void goBack()} style={styles.backRow} disabled={isLoadingVideos}>
              <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
              <Text style={[styles.backText, { color: theme.colors.text }]}>Назад</Text>
            </Pressable>
          ) : null}

          {categories.length > 0 ? (
            <View style={styles.categoryList}>
              <Text style={[styles.intro, { color: theme.colors.textSecondary }]}>Избери категория или подкатегория.</Text>
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => void openCategory(category)}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                    pressed && { backgroundColor: theme.colors.input },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Категория ${category.name}`}
                >
                  <View style={styles.categoryCardRow}>
                    {category.image_url ? <RemoteImage uri={category.image_url} style={styles.categoryImage} /> : (
                      <View style={[styles.categoryIcon, { backgroundColor: theme.colors.primary }]}>
                        <Ionicons name="grid-outline" size={20} color={theme.colors.buttonText} />
                      </View>
                    )}
                    <View style={styles.categoryContent}>
                      <Text style={[styles.categoryName, { color: theme.colors.text }]}>{category.name}</Text>
                      {category.description ? <Text style={[styles.categoryDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>{category.description}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {isLoadingVideos ? <ActivityIndicator style={styles.videoLoader} size="large" color={theme.colors.primary} /> : null}
          {error ? <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text> : null}

          {videos.length > 0 ? (
            <View style={styles.videoList}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Предложени видеоклипове</Text>
              {videos.map((video) => (
                <Pressable key={video.id} onPress={() => openVideoAuthor(video)} style={[styles.videoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} disabled={!video.user}>
                  {video.thumbnail_url ? <RemoteImage uri={video.thumbnail_url} style={styles.videoThumbnail} /> : (
                    <View style={[styles.videoThumbnail, styles.videoThumbnailFallback, { backgroundColor: theme.colors.input }]}>
                      <Ionicons name="videocam-outline" size={24} color={theme.colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.videoContent}>
                    <Text style={[styles.videoTitle, { color: theme.colors.text }]} numberOfLines={2}>{video.title}</Text>
                    {video.description ? <Text style={[styles.videoDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>{video.description}</Text> : null}
                    {video.user ? <Text style={[styles.videoAuthor, { color: theme.colors.primary }]} numberOfLines={1}>{video.user.name}</Text> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {!isLoadingVideos && categoryPath.length > 0 && categories.length === 0 && videos.length === 0 && !error ? (
            <View style={styles.centerState}>
              <Ionicons name="videocam-off-outline" size={44} color={theme.colors.icon} />
              <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>Няма видеоклипове в тази категория.</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 20, gap: 14, paddingBottom: 40 },
  emptyListContent: { flexGrow: 1 },
  categoryList: { gap: 14 },
  intro: { fontSize: 15, lineHeight: 21, marginBottom: 4 },
  categoryCard: { width: "100%", minHeight: 72, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  categoryCardRow: { width: "100%", minHeight: 46, flexDirection: "row", alignItems: "center", gap: 12 },
  categoryIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  categoryImage: { width: 42, height: 42, borderRadius: 21 },
  categoryContent: { flex: 1, gap: 2 },
  categoryName: { fontSize: 16, fontWeight: "700" },
  categoryDescription: { fontSize: 13, lineHeight: 18 },
  backRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 },
  backText: { fontSize: 16, fontWeight: "700" },
  videoList: { gap: 12, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 2 },
  videoCard: { minHeight: 100, borderWidth: 1, borderRadius: 16, padding: 10, flexDirection: "row", gap: 12 },
  videoThumbnail: { width: 128, height: 82, borderRadius: 10 },
  videoThumbnailFallback: { alignItems: "center", justifyContent: "center" },
  videoContent: { flex: 1, gap: 4 },
  videoTitle: { fontSize: 16, fontWeight: "800" },
  videoDescription: { fontSize: 13, lineHeight: 18 },
  videoAuthor: { fontSize: 13, fontWeight: "700" },
  videoLoader: { paddingVertical: 24 },
  errorText: { fontSize: 14, lineHeight: 20 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  stateTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  stateText: { fontSize: 15, lineHeight: 21, textAlign: "center" },
  retryButton: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 4 },
  retryText: { fontSize: 15, fontWeight: "600" },
});
