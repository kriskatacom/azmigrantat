import { useAppTheme } from "@/app/_layout";
import { searchLocations, type LocationKind, type LocationSuggestion } from "@/services/geocoding";
import { FontAwesome } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface LocationSearchFieldProps {
  label: string;
  value: string;
  kind: LocationKind;
  countryCode?: string;
  onChange: (value: string, suggestion?: LocationSuggestion) => void;
}

export default function LocationSearchField({ label, value, kind, countryCode, onChange }: LocationSearchFieldProps) {
  const { theme } = useAppTheme();
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const handleSearch = async () => {
    const query = value.trim();
    if (query.length < 2 || isSearching) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsSearching(true);
    setError(null);
    try {
      setResults(await searchLocations(query, kind, countryCode, controller.signal));
    } catch (searchError) {
      if (searchError instanceof Error && searchError.name === "AbortError") return;
      setResults([]);
      setError(searchError instanceof Error ? searchError.message : "Търсенето не беше успешно.");
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: theme.colors.input, borderColor: theme.colors.inputBorder }]}>
        <TextInput
          value={value}
          onChangeText={(text) => { onChange(text); setResults([]); setError(null); }}
          onSubmitEditing={() => void handleSearch()}
          returnKeyType="search"
          placeholder={`Въведете ${kind === "country" ? "държава" : "град"}`}
          placeholderTextColor={theme.colors.placeholder}
          style={[styles.input, { color: theme.colors.text }]}
        />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Търси ${label.toLowerCase()}`} disabled={value.trim().length < 2 || isSearching} onPress={() => void handleSearch()} style={styles.searchButton}>
          {isSearching ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <FontAwesome name="search" size={18} color={theme.colors.primary} />}
        </TouchableOpacity>
      </View>
      {error ? <Text style={[styles.feedback, { color: theme.colors.danger }]}>{error}</Text> : null}
      {results.length > 0 ? (
        <View style={[styles.results, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {results.map((result) => (
            <TouchableOpacity key={result.id} onPress={() => { onChange(result.name, result); setResults([]); }} style={[styles.result, { borderBottomColor: theme.colors.border }]}>
              <FontAwesome name="map-marker" size={17} color={theme.colors.primary} />
              <Text style={[styles.resultText, { color: theme.colors.text }]} numberOfLines={2}>{result.displayName}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { fontSize: 14, fontWeight: "600" },
  inputRow: { minHeight: 50, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  searchButton: { width: 50, minHeight: 48, alignItems: "center", justifyContent: "center" },
  feedback: { fontSize: 13 },
  results: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  result: { minHeight: 52, borderBottomWidth: 0.5, paddingHorizontal: 13, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10 },
  resultText: { flex: 1, fontSize: 14, lineHeight: 19 },
});
