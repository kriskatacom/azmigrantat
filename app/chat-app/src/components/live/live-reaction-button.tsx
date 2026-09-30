import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { useRef } from "react";

export default function LiveReactionButton({
  emoji,
  label,
  onPress,
  size = 44,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
  size?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animate(0.86)}
      onPressOut={() => animate(1)}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[styles.emoji, { fontSize: Math.round(size * 0.45) }]}>{emoji}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "rgba(8, 12, 24, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { lineHeight: 26 },
});
