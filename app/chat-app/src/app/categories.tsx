import Header from "@/components/Header";
import RemoteImage from "@/components/ui/RemoteImage";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getRootCategories, type Category } from "@/services/categories";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
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
  TouchableOpacity,
  View,
} from "react-native";

export default function CategoriesScreen() {
  const { theme } = useAppTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await getRootCategories();
      setCategories(response.items);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") {
        return;
      }

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

  const renderCategory = (item: Category) => (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.75}
      onPress={() => {
        const url = item.slug.trim();
        if (/^https?:\/\//i.test(url)) {
          void Linking.openURL(url);
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={`Категория ${item.name}`}
      style={[
        styles.categoryCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {item.image_url ? (
        <RemoteImage
          uri={item.image_url}
          style={styles.categoryImage}
          contentFit="cover"
        />
      ) : (
        <View
          style={[styles.categoryIcon, { backgroundColor: theme.colors.primary }]}
        >
          <FontAwesome name="th-large" size={19} color="#ffffff" />
        </View>
      )}
      <View style={styles.categoryContent}>
        <Text style={[styles.categoryName, { color: theme.colors.text }]}>
          {item.name}
        </Text>
        {item.description ? (
          <Text
            style={[styles.categoryDescription, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}
      </View>
      <FontAwesome name="chevron-right" size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: "Категории", headerShown: false }} />
      <Header title="Категории" hideSearchButton />

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
          <Text style={[styles.stateTitle, { color: theme.colors.text }]}>
            Неуспешно зареждане
          </Text>
          <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>
            {error}
          </Text>
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
          contentContainerStyle={[
            styles.listContent,
            categories.length === 0 ? styles.emptyListContent : null,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadCategories(true)}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Text style={[styles.intro, { color: theme.colors.textSecondary }]}>
            Избери категория, за да разглеждаш съдържанието в нея.
          </Text>
          {categories.length > 0 ? (
            categories.map(renderCategory)
          ) : (
            <View style={styles.centerState}>
              <Ionicons name="grid-outline" size={48} color={theme.colors.icon} />
              <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>
                Все още няма налични категории.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 40,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  intro: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 4,
  },
  categoryCard: {
    width: "100%",
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  categoryContent: {
    flex: 1,
    gap: 2,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "700",
  },
  categoryDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  stateText: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  retryButton: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 4,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
