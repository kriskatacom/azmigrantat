import { useUserSettings } from "@/hooks/useUserSettings";
import { getChatFontMetrics } from "@/services/user-settings";
import { StyleSheet, Text, View } from "react-native";

type ChatDateSeparatorProps = {
  label: string;
  textColor: string;
  backgroundColor: string;
};

export default function ChatDateSeparator({
  label,
  textColor,
  backgroundColor,
}: ChatDateSeparatorProps) {
  const { chatFontSize } = useUserSettings();
  const fonts = getChatFontMetrics(chatFontSize);

  if (!label) {
    return null;
  }

  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor }]}>
        <Text style={[styles.label, { color: textColor, fontSize: fonts.date }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    marginBottom: 8,
    marginTop: 12,
  },
  pill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
