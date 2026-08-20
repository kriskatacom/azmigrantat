import { Image, StyleSheet, Text, View } from "react-native";

const SPLASH_BACKGROUND = "#0E3545";

type AppSplashProps = {
  onReady?: () => void;
};

export default function AppSplash({ onReady }: AppSplashProps) {
  return (
    <View
      accessibilityLabel="Ето ме"
      onLayout={() => onReady?.()}
      style={styles.screen}
    >
      <Image
        accessibilityIgnoresInvertColors
        source={require("../../assets/images/eto-me.png")}
        style={styles.icon}
        resizeMode="contain"
      />
      <Text style={styles.company}>от Аз мигрантът</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SPLASH_BACKGROUND,
  },
  icon: {
    width: 168,
    height: 168,
    borderRadius: 36,
  },
  company: {
    marginTop: 18,
    color: "#9EC9D6",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
});
