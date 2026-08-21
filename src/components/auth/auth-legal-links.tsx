import { useAppTheme } from "@/app/_layout";
import { PRIVACY_URL, TERMS_URL } from "@/constants/legal";
import { Linking, StyleSheet, Text, View } from "react-native";

interface AuthLegalLinksProps {
  preface?: string;
}

export default function AuthLegalLinks({
  preface = "Продължавайки, приемате",
}: AuthLegalLinksProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
        {preface}{" "}
        <Text
          style={[styles.link, { color: theme.colors.primary }]}
          onPress={() => void Linking.openURL(TERMS_URL)}
        >
          Общите условия
        </Text>
        {" и "}
        <Text
          style={[styles.link, { color: theme.colors.primary }]}
          onPress={() => void Linking.openURL(PRIVACY_URL)}
        >
          Политиката за поверителност
        </Text>
        {" на Аз, мигрантът."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 18,
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  link: {
    fontWeight: "700",
  },
});
