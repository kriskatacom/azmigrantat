import {
  AUTH_ELEMENT_GAP,
  AUTH_HORIZONTAL_PADDING,
} from "@/constants/auth-layout";
import { StatusBar } from "expo-status-bar";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";

type AuthHeroProps = {
  title: string;
  subtitle: string;
};

const HERO_HEIGHT_RATIO = 0.34;

export default function AuthHero({ title, subtitle }: AuthHeroProps) {
  const { height } = useWindowDimensions();

  return (
    <View style={[styles.container, { minHeight: height * HERO_HEIGHT_RATIO }]}>
      <StatusBar style="light" />
      <Image
        source={require("../../../assets/images/logo-dark.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: AUTH_HORIZONTAL_PADDING,
    paddingVertical: 24,
    gap: AUTH_ELEMENT_GAP,
  },
  logo: {
    width: 180,
    height: 82,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.76)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
