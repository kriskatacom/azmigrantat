import Header from "@/components/Header";
import RemoteImage from "@/components/ui/RemoteImage";
import PlaceSelector from "@/components/location/place-selector";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getCategories, getRootCategories, type Category } from "@/services/categories";
import { getNearbyPlaces, placeSubtitle, type PlaceItem } from "@/services/places";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import * as Location from "expo-location";
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
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceItem[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyMessage, setNearbyMessage] = useState<string | null>(null);
  const [leafCategoryId, setLeafCategoryId] = useState<number | null>(null);
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
      setSelectedPlace(null);
      setNearbyPlaces([]);
      setNearbyMessage(null);
      setLeafCategoryId(null);
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

  useEffect(() => {
    if (!leafCategoryId) return;
    let active = true;
    const loadNearbyAutomatically = async () => {
      setIsLoadingNearby(true);
      setNearbyMessage(null);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (active) setNearbyMessage("Разрешете местоположението или потърсете населено място ръчно.");
          return;
        }
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const places = await getNearbyPlaces(current.coords.latitude, current.coords.longitude);
        if (!active) return;
        setNearbyPlaces(places);
        if (places.length === 0) setNearbyMessage("Не бяха намерени близки населени места.");
      } catch (locationError) {
        if (active) setNearbyMessage(locationError instanceof Error ? locationError.message : "Местоположението не може да бъде определено.");
      } finally {
        if (active) setIsLoadingNearby(false);
      }
    };
    void loadNearbyAutomatically();
    return () => { active = false; };
  }, [leafCategoryId]);

  const openCategory = async (category: Category) => {
    setError(null);
    setIsLoadingVideos(true);
    try {
      const childrenResponse = await getCategories(category.id);
      const nextPath = [...categoryPath, category];

      if (childrenResponse.items.length > 0) {
        setCategoryPath(nextPath);
        setCategories(childrenResponse.items);
        setSelectedPlace(null);
        setNearbyPlaces([]);
        setNearbyMessage(null);
        setLeafCategoryId(null);
        return;
      }

      setCategoryPath(nextPath);
      setCategories([]);
      setSelectedPlace(null);
      setNearbyPlaces([]);
      setNearbyMessage(null);
      setLeafCategoryId(category.id);
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
      setSelectedPlace(null);
      setNearbyPlaces([]);
      setNearbyMessage(null);
      setLeafCategoryId(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Категориите не можаха да се заредят.");
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const openPlaceVideos = (place: PlaceItem | null) => {
    setSelectedPlace(place);
    if (!leafCategoryId || !place) return;
    const currentCategory = categoryPath[categoryPath.length - 1];
    router.push({
      pathname: "/category-videos",
      params: {
        categoryId: String(leafCategoryId),
        categoryName: currentCategory?.name ?? "Видеоклипове",
        placeId: String(place.id),
        placeName: place.name,
      },
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
      ) : error && categories.length === 0 && !leafCategoryId ? (
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
          contentContainerStyle={[styles.listContent, categories.length === 0 && !leafCategoryId ? styles.emptyListContent : null]}
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

          {leafCategoryId ? (
            <View style={styles.placeFilter}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Най-близки населени места</Text>
              {isLoadingNearby ? (
                <View style={styles.nearbyLoadingRow}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={[styles.nearbyMessage, { color: theme.colors.textSecondary }]}>Определяме местоположението ви...</Text>
                </View>
              ) : null}
              {nearbyMessage ? <Text style={[styles.nearbyMessage, { color: theme.colors.textSecondary }]}>{nearbyMessage}</Text> : null}
              {nearbyPlaces.length > 0 ? (
                <View style={styles.nearbyPlaces}>
                  {nearbyPlaces.map((place) => {
                    const selected = selectedPlace?.id === place.id;
                    return (
                      <Pressable
                        key={place.id}
                        onPress={() => openPlaceVideos(place)}
                        style={[
                          styles.nearbyPlace,
                          { backgroundColor: selected ? theme.colors.primary : theme.colors.input, borderColor: selected ? theme.colors.primary : theme.colors.border },
                        ]}
                      >
                        <Ionicons name="location" size={18} color={selected ? theme.colors.buttonText : theme.colors.primary} />
                        <View style={styles.nearbyPlaceCopy}>
                          <Text style={[styles.nearbyPlaceName, { color: selected ? theme.colors.buttonText : theme.colors.text }]}>{place.name}</Text>
                          <Text style={[styles.nearbyPlaceSubtitle, { color: selected ? theme.colors.buttonText : theme.colors.textSecondary }]} numberOfLines={1}>
                            {[place.distance_km != null ? `${place.distance_km} km` : null, placeSubtitle(place)].filter(Boolean).join(" · ")}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              <PlaceSelector value={selectedPlace} onChange={openPlaceVideos} label="Потърси друго населено място" />
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
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 2 },
  videoLoader: { paddingVertical: 24 },
  placeFilter: { gap: 10, marginTop: 2 },
  nearbyLoadingRow: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10 },
  nearbyMessage: { fontSize: 14, lineHeight: 20 },
  nearbyPlaces: { gap: 8 },
  nearbyPlace: { minHeight: 60, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10 },
  nearbyPlaceCopy: { flex: 1, gap: 2 },
  nearbyPlaceName: { fontSize: 15, fontWeight: "800" },
  nearbyPlaceSubtitle: { fontSize: 12, lineHeight: 17 },
  errorText: { fontSize: 14, lineHeight: 20 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  stateTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  stateText: { fontSize: 15, lineHeight: 21, textAlign: "center" },
  retryButton: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 4 },
  retryText: { fontSize: 15, fontWeight: "600" },
});
