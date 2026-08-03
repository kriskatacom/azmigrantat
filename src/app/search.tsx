import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SearchScreen() {
  const { theme } = useAppTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (!query.trim()) return;

    console.log("Търсене на постове:", query.trim());
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header title="Търсене на видеоклипове" />

      <View style={styles.content}>
        <Text
          style={[
            styles.description,
            isDark ? styles.subTextDark : styles.subTextLight,
          ]}
        >
          Въведете ключова дума или част от заглавието на публикацията.
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Например: работа в Германия"
          placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          style={[
            styles.input,
            isDark ? styles.inputDark : styles.inputLight,
            isDark ? styles.textDark : styles.textLight,
          ]}
        />

        <TouchableOpacity
          onPress={handleSearch}
          style={[
            styles.searchButton,
            !query.trim() && styles.searchButtonDisabled,
          ]}
          disabled={!query.trim()}
        >
          <FontAwesome name="search" size={18} color="#ffffff" />
          <Text style={styles.searchButtonText}>Търси</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: "#f4f4f5",
  },
  bgDark: {
    backgroundColor: "#09090b",
  },
  header: {
    paddingTop: 15,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerLight: {
    backgroundColor: "#ffffff",
    borderBottomColor: "#e4e4e7",
  },
  headerDark: {
    backgroundColor: "#18181b",
    borderBottomColor: "#27272a",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputLight: {
    backgroundColor: "#ffffff",
    borderColor: "#d4d4d8",
  },
  inputDark: {
    backgroundColor: "#18181b",
    borderColor: "#3f3f46",
  },
  searchButton: {
    minHeight: 52,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  textLight: {
    color: "#09090b",
  },
  textDark: {
    color: "#ffffff",
  },
  subTextLight: {
    color: "#52525b",
  },
  subTextDark: {
    color: "#a1a1aa",
  },
});
