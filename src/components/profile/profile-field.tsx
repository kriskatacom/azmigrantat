import { useAppTheme } from "@/app/_layout";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

interface ProfileFieldProps extends TextInputProps {
  label: string;
}

export default function ProfileField({ label, style, ...props }: ProfileFieldProps) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, { backgroundColor: theme.colors.input, borderColor: theme.colors.inputBorder, color: theme.colors.text }, style]}
        placeholderTextColor={theme.colors.placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { fontSize: 14, fontWeight: "600" },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
});
