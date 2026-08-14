import { useAppTheme } from "@/app/_layout";
import { searchUsers } from "@/services/chat";
import type { ChatUser } from "@/types/chat";
import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface UserSearchProps {
  token: string | null;
  onSelectUser: (user: ChatUser) => void;
  isSelecting: boolean;
}

export default function UserSearch({ token, onSelectUser, isSelecting }: UserSearchProps) {
  const { theme } = useAppTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!token || normalizedQuery.length < 2) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        setResults(await searchUsers(token, normalizedQuery, controller.signal));
      } catch (searchError) {
        if (searchError instanceof Error && searchError.name === "AbortError") return;
        setResults([]);
        setError(searchError instanceof Error ? searchError.message : "Търсенето не беше успешно.");
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, token]);

  const showNoResults = query.trim().length >= 2 && !isSearching && !error && results.length === 0;

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.border }]}>
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.input, borderColor: theme.colors.inputBorder }]}>
        <FontAwesome name="search" size={17} color={theme.colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Търси потребител по име"
          placeholderTextColor={theme.colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: theme.colors.text }]}
        />
        {isSearching ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
      </View>

      {error ? <Text style={[styles.feedback, { color: theme.colors.danger }]}>{error}</Text> : null}
      {showNoResults ? <Text style={[styles.feedback, { color: theme.colors.textSecondary }]}>Няма намерени потребители.</Text> : null}

      {results.length > 0 ? (
        <View style={[styles.results, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {results.map((result) => (
            <TouchableOpacity key={result.id} disabled={isSelecting} onPress={() => onSelectUser(result)} style={[styles.result, { borderBottomColor: theme.colors.border }]}>
              {result.profile_image ? <Image source={{ uri: result.profile_image }} style={styles.avatar} /> : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
                  <FontAwesome name="user" size={18} color={theme.colors.textSecondary} />
                </View>
              )}
              <View style={styles.resultText}>
                <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{result.name}</Text>
                {result.username ? <Text style={{ color: theme.colors.textSecondary }} numberOfLines={1}>@{result.username}</Text> : null}
              </View>
              {isSelecting ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <FontAwesome name="chevron-right" size={14} color={theme.colors.textSecondary} />}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 0.5 },
  inputContainer: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  feedback: { fontSize: 13, marginTop: 8 },
  results: { marginTop: 8, borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  result: { minHeight: 58, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  resultText: { flex: 1, paddingHorizontal: 10 },
  name: { fontSize: 15, fontWeight: "700" },
});
