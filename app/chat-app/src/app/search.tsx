import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import RemoteImage from "@/components/ui/RemoteImage";
import PublicVideoPager from "@/components/video/public-video-pager";
import { getVideoDisplayTitle, shouldHideVideoUploader } from "@/constants/featured-video";
import { listPublicVideos, searchPublicUsers } from "@/services/videos";
import { useAuth } from "@/hooks/useAuth";
import type { PublicUserSearchItem, PublicVideoItem } from "@/types/video";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SearchScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<PublicVideoItem[]>([]);
  const [users, setUsers] = useState<PublicUserSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setVideos([]);
      setUsers([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setIsSearching(true);
      setError(null);
      void Promise.all([
        listPublicVideos(normalizedQuery, controller.signal),
        searchPublicUsers(normalizedQuery, controller.signal),
      ]).then(([videoResponse, userResponse]) => {
        if (controller.signal.aborted) return;
        setVideos(videoResponse.data);
        setUsers(userResponse.data);
      }).catch((searchError) => {
        if (controller.signal.aborted) return;
        setError(searchError instanceof Error ? searchError.message : "Търсенето не беше успешно.");
        setVideos([]);
        setUsers([]);
      }).finally(() => {
        if (!controller.signal.aborted) setIsSearching(false);
      });
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const openProfile = (userId: number, videoId?: number) => {
    router.push({
      pathname: "/user/[id]",
      params: {
        id: String(userId),
        ...(videoId ? { videoId: String(videoId) } : {}),
      },
    });
  };

  const showResults = query.trim().length >= 2;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header title="Търсене" hideSearchButton />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.inputWrap, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.card }]}>
          <FontAwesome name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Търси по ключови думи или потребител"
            placeholderTextColor={theme.colors.placeholder}
            returnKeyType="search"
            style={[styles.input, { color: theme.colors.text }]}
          />
          {isSearching ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
        </View>

        {!showResults ? (
          <View style={styles.hintGroup}>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Например: София, пътуване или име на потребител.</Text>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Въведете поне 2 символа.</Text>
          </View>
        ) : null}
        {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}

        {showResults && users.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Потребители</Text>
            {users.map((user) => (
              <Pressable
                key={user.id}
                style={[styles.userRow, { borderBottomColor: theme.colors.border }]}
                onPress={() => openProfile(user.id)}
                accessibilityRole="button"
                accessibilityLabel={`Отвори профила на ${user.name}`}
              >
                {user.profile_image ? <RemoteImage uri={user.profile_image} style={styles.userAvatar} /> : (
                  <View style={[styles.userAvatar, styles.avatarFallback, { backgroundColor: theme.colors.primary }]}>
                    <FontAwesome name="user" size={18} color={theme.colors.buttonText} />
                  </View>
                )}
                <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>{user.name}</Text>
                <FontAwesome name="chevron-right" size={14} color={theme.colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {showResults && videos.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Видеоклипове</Text>
            {videos.map((video, index) => (
              <Pressable
                key={video.id}
                style={[styles.videoRow, { borderBottomColor: theme.colors.border }]}
                onPress={() => setSelectedVideoIndex(index)}
                disabled={!video.playback_url}
              >
                {video.thumbnail_url ? <RemoteImage uri={video.thumbnail_url} style={styles.thumbnail} /> : (
                  <View style={[styles.thumbnail, styles.thumbnailFallback, { backgroundColor: theme.colors.card }]}>
                    <FontAwesome name="film" size={22} color={theme.colors.textSecondary} />
                  </View>
                )}
                <View style={styles.videoMeta}>
                  {getVideoDisplayTitle(video) ? (
                    <Text style={[styles.videoTitle, { color: theme.colors.text }]} numberOfLines={2}>{getVideoDisplayTitle(video)}</Text>
                  ) : null}
                  {video.description ? <Text style={[styles.videoDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>{video.description}</Text> : null}
                  {video.user && !shouldHideVideoUploader(video.id) ? <Text style={[styles.videoAuthor, { color: theme.colors.primary }]} numberOfLines={1}>{video.user.name}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {showResults && !isSearching && !error && users.length === 0 && videos.length === 0 ? (
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Няма намерени резултати.</Text>
        ) : null}
      </ScrollView>
      <PublicVideoPager
        visible={selectedVideoIndex !== null}
        videos={videos}
        initialIndex={selectedVideoIndex ?? 0}
        onClose={() => setSelectedVideoIndex(null)}
        colors={theme.colors}
        token={token}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 18 },
  inputWrap: { minHeight: 54, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  input: { flex: 1, minHeight: 52, fontSize: 14 },
  hintGroup: { gap: 2 },
  hint: { fontSize: 15, lineHeight: 22 },
  error: { fontSize: 14, lineHeight: 20 },
  section: { gap: 4 },
  sectionTitle: { fontSize: 19, fontWeight: "800", marginBottom: 4 },
  userRow: { minHeight: 64, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  userAvatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  userName: { flex: 1, fontSize: 16, fontWeight: "700" },
  videoRow: { paddingVertical: 10, flexDirection: "row", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  thumbnail: { width: 112, height: 74, borderRadius: 10 },
  thumbnailFallback: { alignItems: "center", justifyContent: "center" },
  videoMeta: { flex: 1, gap: 4 },
  videoTitle: { fontSize: 16, fontWeight: "800" },
  videoDescription: { fontSize: 13, lineHeight: 18 },
  videoAuthor: { fontSize: 13, fontWeight: "700" },
});
