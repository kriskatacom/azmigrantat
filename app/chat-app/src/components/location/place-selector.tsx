import { useAppTheme } from "@/contexts/ThemeContext";
import { getNearbyPlaces, placeSubtitle, searchPlaces, type PlaceItem } from "@/services/places";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function PlaceSelector({ value, onChange, label = "Населено място (по желание)" }: {
  value: PlaceItem | null;
  onChange: (place: PlaceItem | null) => void;
  label?: string;
}) {
  const { theme } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showingNearby, setShowingNearby] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!visible || query.trim().length < 3) {
      return;
    }
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    const timer = setTimeout(() => {
      setLoading(true);
      setShowingNearby(false);
      setMessage(null);
      void searchPlaces(query, coordinates, controller.signal)
        .then(setResults)
        .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setMessage(error.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [coordinates, query, visible]);

  const loadNearby = async () => {
    setLocationLoading(true);
    setMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setMessage("Достъпът до GPS е отказан. Можете да търсите по име.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const next = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setCoordinates(next);
      setQuery("");
      const nearby = await getNearbyPlaces(next.latitude, next.longitude);
      setResults(nearby);
      setShowingNearby(true);
      if (nearby.length === 0) setMessage("Не бяха намерени населени места в близост.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Местоположението не може да бъде определено.");
    } finally {
      setLocationLoading(false);
    }
  };

  const choose = (place: PlaceItem) => {
    onChange(place);
    setVisible(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <Pressable style={[styles.trigger, { backgroundColor: theme.colors.card, borderColor: theme.colors.inputBorder }]} onPress={() => setVisible(true)}>
        <Ionicons name="location-outline" size={22} color={theme.colors.primary} />
        <View style={styles.triggerCopy}>
          <Text style={[styles.value, { color: theme.colors.text }]}>{value?.name ?? "Избери населено място"}</Text>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{value ? placeSubtitle(value) || "OpenStreetMap" : "Незадължително"}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </Pressable>
      {value ? <Pressable onPress={() => onChange(null)}><Text style={[styles.clear, { color: theme.colors.danger }]}>Премахни населеното място</Text></Pressable> : null}

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={[styles.modal, { backgroundColor: theme.colors.background }]}>
          <View style={styles.header}>
            <Pressable onPress={() => setVisible(false)}><Ionicons name="close" size={28} color={theme.colors.text} /></Pressable>
            <Text style={[styles.title, { color: theme.colors.text }]}>Избери населено място</Text>
            <View style={styles.headerSpacer} />
          </View>
          <TextInput
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setShowingNearby(false);
              if (text.trim().length < 3) setResults([]);
            }}
            placeholder="Държава, регион, град или село"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.card, borderColor: theme.colors.inputBorder }]}
            autoCorrect={false}
          />
          <Pressable style={[styles.nearbyButton, { backgroundColor: theme.colors.primary }]} onPress={() => void loadNearby()} disabled={locationLoading}>
            {locationLoading ? <ActivityIndicator color="#fff" /> : <Ionicons name="navigate" size={20} color="#fff" />}
            <Text style={styles.nearbyText}>Най-близо до мен</Text>
          </Pressable>
          {loading ? <ActivityIndicator style={styles.loader} color={theme.colors.primary} /> : null}
          {message ? <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text> : null}
          {showingNearby && results.length > 0 ? (
            <Text style={[styles.resultHeading, { color: theme.colors.text }]}>Най-близки населени места</Text>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.results}>
            {results.map((place) => (
              <Pressable key={place.id} onPress={() => choose(place)} style={[styles.result, { borderBottomColor: theme.colors.border }]}>
                <Ionicons name="location" size={20} color={theme.colors.primary} />
                <View style={styles.triggerCopy}>
                  <Text style={[styles.resultName, { color: theme.colors.text }]}>{place.name}</Text>
                  <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{placeSubtitle(place)}</Text>
                </View>
                {place.distance_km != null ? <Text style={[styles.distance, { color: theme.colors.primary }]}>{place.distance_km} km</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
          <Text style={[styles.attribution, { color: theme.colors.textSecondary }]}>© OpenStreetMap contributors</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 }, label: { fontSize: 15, fontWeight: "700" },
  trigger: { minHeight: 70, borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  triggerCopy: { flex: 1, gap: 3 }, value: { fontSize: 16, fontWeight: "700" }, hint: { fontSize: 13, lineHeight: 18 }, clear: { fontSize: 14, fontWeight: "700", alignSelf: "flex-start" },
  modal: { flex: 1, paddingTop: 52, paddingHorizontal: 18 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  title: { fontSize: 20, fontWeight: "800" }, headerSpacer: { width: 28 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 16 },
  nearbyButton: { minHeight: 50, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 12 },
  nearbyText: { color: "#fff", fontSize: 16, fontWeight: "800" }, loader: { marginTop: 18 }, message: { textAlign: "center", marginTop: 14, lineHeight: 20 },
  resultHeading: { marginTop: 18, fontSize: 16, fontWeight: "800" },
  results: { paddingVertical: 12, paddingBottom: 50 }, result: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  resultName: { fontSize: 16, fontWeight: "700" }, distance: { fontSize: 13, fontWeight: "800" }, attribution: { textAlign: "center", fontSize: 12, paddingVertical: 12 },
});
