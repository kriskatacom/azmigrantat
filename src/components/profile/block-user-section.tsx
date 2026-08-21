import { useAppTheme } from "@/app/_layout";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type BlockUserSectionProps = {
  isBlocking: boolean;
  onBlock: (code: string) => Promise<boolean>;
};

export default function BlockUserSection({
  isBlocking,
  onBlock,
}: BlockUserSectionProps) {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleBlock = async () => {
    const blocked = await onBlock(code);
    if (blocked) {
      setCode("");
    }
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Блокирани потребители
      </Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Въведете кода на човека, който искате да блокирате. Кодът се вижда в
        профила му и в чата.
      </Text>
      <AppInput
        label="Код на потребител"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="Например: ABCD-EFGH"
      />
      <AppButton
        title="Блокирай"
        loading={isBlocking}
        disabled={code.trim().length < 8}
        onPress={() => void handleBlock()}
      />
      <TouchableOpacity
        onPress={() => router.push("/(profile)/blocked")}
        style={[
          styles.listLink,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Отвори списъка с блокирани потребители"
      >
        <View
          style={[
            styles.icon,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <FontAwesome name="ban" size={18} color={theme.colors.danger} />
        </View>
        <View style={styles.linkText}>
          <Text style={[styles.linkTitle, { color: theme.colors.text }]}>
            Списък с блокирани
          </Text>
          <Text
            style={[styles.linkDescription, { color: theme.colors.textSecondary }]}
          >
            Преглед и отблокиране
          </Text>
        </View>
        <FontAwesome
          name="chevron-right"
          size={16}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  title: { fontSize: 22, fontWeight: "800" },
  description: { fontSize: 14, lineHeight: 20 },
  listLink: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: { flex: 1, gap: 2 },
  linkTitle: { fontSize: 16, fontWeight: "700" },
  linkDescription: { fontSize: 13, lineHeight: 18 },
});
