import { useAppTheme } from "@/app/_layout";
import type { Gender } from "@/types/auth";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const options: { value: Gender; label: string }[] = [
  { value: "male", label: "Мъж" },
  { value: "female", label: "Жена" },
];

interface GenderFieldProps {
  value: Gender | null;
  onChange: (value: Gender) => void;
}

export default function GenderField({ value, onChange }: GenderFieldProps) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.text }]}>Пол</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.option,
                {
                  borderColor: selected
                    ? theme.colors.primary
                    : theme.colors.inputBorder,
                  backgroundColor: selected
                    ? theme.colors.primary
                    : theme.colors.input,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? theme.colors.buttonText : theme.colors.text,
                  fontWeight: "600",
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
