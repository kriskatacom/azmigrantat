import { Ionicons } from "@expo/vector-icons";
import RemoteImage from "@/components/ui/RemoteImage";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ActiveCallBarProps = {
  visible: boolean;
  name: string;
  image?: string | null;
  durationSeconds: number;
  connected: boolean;
  onPress: () => void;
  onEndCall: () => void;
};

function formatDuration(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

export default function ActiveCallBar({
  visible,
  name,
  image,
  durationSeconds,
  connected,
  onPress,
  onEndCall,
}: ActiveCallBarProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [barHeight, setBarHeight] = useState(0);
  const [positionReady, setPositionReady] = useState(false);
  const positionY = useRef(new Animated.Value(0)).current;
  const positionYRef = useRef(0);
  const dragOriginYRef = useRef(0);
  const initializedRef = useRef(false);
  const verticalBoundsRef = useRef({ min: 0, max: 0 });

  verticalBoundsRef.current = {
    min: insets.top,
    max: Math.max(insets.top, screenHeight - insets.bottom - barHeight),
  };

  const setVerticalPosition = useCallback((value: number) => {
    const nextValue = Math.max(
      verticalBoundsRef.current.min,
      Math.min(value, verticalBoundsRef.current.max),
    );
    positionYRef.current = nextValue;
    positionY.setValue(nextValue);
  }, [positionY]);

  useEffect(() => {
    if (!visible) {
      initializedRef.current = false;
      setPositionReady(false);
      return;
    }
    if (barHeight === 0) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      setVerticalPosition(screenHeight - insets.bottom - 12 - barHeight);
      setPositionReady(true);
      return;
    }
    setVerticalPosition(positionYRef.current);
  }, [barHeight, insets.bottom, screenHeight, setVerticalPosition, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
      onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
        Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
      onPanResponderGrant: () => {
        dragOriginYRef.current = positionYRef.current;
      },
      onPanResponderMove: (_event, gestureState) => {
        setVerticalPosition(dragOriginYRef.current + gestureState.dy);
      },
    }),
  ).current;

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      onLayout={(event: LayoutChangeEvent) => {
        const { height } = event.nativeEvent.layout;
        setBarHeight((current) => current === height ? current : height);
      }}
      style={[
        styles.wrap,
        {
          opacity: positionReady ? 1 : 0,
          transform: [{ translateY: positionY }],
        },
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Върни се към обаждането"
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.bar}
      >
        {image ? (
          <RemoteImage uri={image} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" color="#e0f2fe" size={18} />
          </View>
        )}
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          <Text style={styles.status}>
            {connected ? formatDuration(durationSeconds) : "Обаждане в ход"}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Приключи обаждането"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onEndCall}
          style={styles.endButton}
        >
          <Ionicons name="call" color="#ffffff" size={18} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    zIndex: 30,
  },
  bar: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 18,
    backgroundColor: "#0f766e",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#115e59",
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#115e59",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  status: {
    color: "#ccfbf1",
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  endButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e11d48",
    transform: [{ rotate: "135deg" }],
  },
});
