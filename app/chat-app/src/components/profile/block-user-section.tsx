import { useAppTheme } from "@/app/_layout";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type BlockUserSectionProps = {
  isBlocking: boolean;
  onBlock: (code: string) => Promise<boolean>;
};

export default function BlockUserSection({
  isBlocking,
  onBlock,
}: BlockUserSectionProps) {
  const { theme } = useAppTheme();
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
        Блокирай по код
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
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "800" },
  description: { fontSize: 14, lineHeight: 20 },
});
