import { useAppTheme } from "@/app/_layout";
import countries from "@/constants/countries.json";
import { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const COUNTRY_OPTIONS = Object.entries(countries)
  .map(([code, name]) => ({ code, name }))
  .sort((first, second) => first.name.localeCompare(second.name));

interface CountryFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CountryField({ value, onChange }: CountryFieldProps) {
  const { theme } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);

  const suggestions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();

    if (!query) return COUNTRY_OPTIONS.slice(0, 8);

    return COUNTRY_OPTIONS.filter(
      ({ code, name }) =>
        name.toLocaleLowerCase().includes(query) ||
        code.toLocaleLowerCase().startsWith(query),
    ).slice(0, 8);
  }, [value]);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.text }]}>Държава</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        autoCapitalize="words"
        autoCorrect={false}
        placeholder="Започнете да въвеждате държава"
        placeholderTextColor={theme.colors.placeholder}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.input,
            borderColor: theme.colors.inputBorder,
            color: theme.colors.text,
          },
        ]}
      />

      {isFocused && suggestions.length > 0 ? (
        <View
          style={[
            styles.suggestions,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {suggestions.map(({ code, name }, index) => (
            <TouchableOpacity
              key={code}
              accessibilityRole="button"
              onPress={() => {
                onChange(name);
                setIsFocused(false);
              }}
              style={[
                styles.suggestion,
                index < suggestions.length - 1 && {
                  borderBottomColor: theme.colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text
                style={[styles.countryName, { color: theme.colors.text }]}
              >
                {name}
              </Text>
              <Text
                style={[
                  styles.countryCode,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {code}
              </Text>
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
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  suggestions: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  suggestion: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  countryName: { flex: 1, fontSize: 15 },
  countryCode: { fontSize: 12, fontWeight: "700" },
});
