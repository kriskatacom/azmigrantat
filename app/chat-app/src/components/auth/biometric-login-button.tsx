import { useAppTheme } from "@/app/_layout";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

interface BiometricLoginButtonProps {
  label: string;
  loading?: boolean;
  onPress: () => void;
}

export default function BiometricLoginButton({
  label,
  loading = false,
  onPress,
}: BiometricLoginButtonProps) {
  const { theme } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.background,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <Ionicons name="lock-closed" size={22} color={theme.colors.primary} />
      )}
      <Text style={[styles.label, { color: theme.colors.primary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
});
