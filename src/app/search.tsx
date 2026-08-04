import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import { FontAwesome } from "@expo/vector-icons";
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
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (!query.trim()) return;

    console.log("Търсене на постове:", query.trim());
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header title="Търсене на видеоклипове" />

      <View style={styles.content}>
        <Text
          style={[styles.description, { color: theme.colors.textSecondary }]}
        >
          Въведете ключова дума или част от заглавието на публикацията.
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Например: работа в Германия"
          placeholderTextColor={theme.colors.placeholder}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.inputBorder,
              color: theme.colors.text,
            },
          ]}
        />

        <TouchableOpacity
          onPress={handleSearch}
          style={[
            styles.searchButton,
            { backgroundColor: theme.colors.button },
            !query.trim() && styles.searchButtonDisabled,
          ]}
          disabled={!query.trim()}
        >
          <FontAwesome
            name="search"
            size={18}
            color={theme.colors.buttonText}
          />

          <Text
            style={[
              styles.searchButtonText,
              { color: theme.colors.buttonText },
            ]}
          >
            Търси
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  searchButton: {
    minHeight: 52,
    marginTop: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
