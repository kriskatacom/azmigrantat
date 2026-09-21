import { useAppTheme } from "@/app/_layout";
import RemoteImage from "@/components/ui/RemoteImage";
import { searchUsers } from "@/services/chat";
import type { ChatUser } from "@/types/chat";
import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type BlockUserSectionProps = {
  token: string | null;
  isBlocking: boolean;
  onBlock: (code: string) => Promise<boolean>;
};

export default function BlockUserSection({
  token,
  isBlocking,
  onBlock,
}: BlockUserSectionProps) {
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
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Търсенето не беше успешно.",
        );
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, token]);

  const handleBlock = async (user: ChatUser) => {
    if (!user.public_code) return;

    const blocked = await onBlock(user.public_code);
    if (blocked) {
      setQuery("");
      setResults([]);
    }
  };

  const showNoResults =
    query.trim().length >= 2 && !isSearching && !error && results.length === 0;

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Блокирай потребител
      </Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Потърсете човека по име, телефонен номер или потребителски код, след
        което го изберете от резултатите.
      </Text>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.input,
            borderColor: theme.colors.inputBorder,
          },
        ]}
      >
        <FontAwesome name="search" size={17} color={theme.colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Код, име или телефонен номер"
          placeholderTextColor={theme.colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: theme.colors.text }]}
        />
        {isSearching ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.feedback, { color: theme.colors.danger }]}>{error}</Text>
      ) : null}
      {showNoResults ? (
        <Text style={[styles.feedback, { color: theme.colors.textSecondary }]}>
          Няма намерени потребители.
        </Text>
      ) : null}

      {results.length > 0 ? (
        <View
          style={[
            styles.results,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
          {results.map((result) => (
            <TouchableOpacity
              key={result.id}
              disabled={isBlocking || !result.public_code}
              onPress={() => void handleBlock(result)}
              style={[styles.result, { borderBottomColor: theme.colors.border }]}
            >
              {result.profile_image ? (
                <RemoteImage uri={result.profile_image} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <FontAwesome name="user" size={18} color={theme.colors.textSecondary} />
                </View>
              )}
              <View style={styles.resultText}>
                <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                  {result.name}
                </Text>
                <Text style={{ color: theme.colors.textSecondary }} numberOfLines={1}>
                  {result.public_code ?? result.username ?? ""}
                </Text>
              </View>
              {isBlocking ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={[styles.blockAction, { color: theme.colors.danger }]}>Блокирай</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "800" },
  description: { fontSize: 14, lineHeight: 20 },
  inputContainer: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  feedback: { fontSize: 13 },
  results: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  result: {
    minHeight: 62,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  resultText: { flex: 1, paddingHorizontal: 10 },
  name: { fontSize: 15, fontWeight: "700" },
  blockAction: { fontSize: 14, fontWeight: "700" },
});
