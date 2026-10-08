import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title: string;
  description: string | null;
  visible?: boolean;
  height?: number | `${number}%`;
  allowExpand?: boolean;
  fitContent?: boolean;
  bottomOffset?: number;
  topOffset?: number;
  maxHeight?: number;
  interactionKey?: number;
  isPlaying?: boolean;
};

export default function VideoCaption({
  title,
  description,
  visible = true,
  bottomOffset = 0,
  interactionKey = 0,
  isPlaying = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);
  const [descriptionHeight, setDescriptionHeight] = useState(50);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useSharedValue(visible ? 1 : 0);
  const translateY = useSharedValue(visible ? 0 : 10);
  const hasContent = Boolean(title.trim() || description?.trim());
  const cleanDescription = description?.trim() ?? "";
  const hasDescription = cleanDescription.length > 0;

  useEffect(() => {
    opacity.value = withTiming(visible && hasContent && !autoHidden ? 1 : 0, { duration: 220 });
    translateY.value = withTiming(visible && hasContent ? 0 : 10, { duration: 220 });
    if (!visible) setExpanded(false);
  }, [autoHidden, hasContent, opacity, translateY, visible]);

  useEffect(() => {
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    if (!visible || !isPlaying) {
      setAutoHidden(false);
      return;
    }

    setAutoHidden(false);
    autoHideTimerRef.current = setTimeout(() => {
      setAutoHidden(true);
      autoHideTimerRef.current = null;
    }, 3000);

    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, [interactionKey, isPlaying, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!hasContent) return null;

  const bottom = Math.max(insets.bottom + 8, 24, bottomOffset);
  const gradientHeight = Math.max(72, Math.min(descriptionHeight + 20, 280));

  return (
    <Animated.View
      pointerEvents={visible && !autoHidden ? "box-none" : "none"}
      layout={LinearTransition.duration(280)}
      style={[styles.triggerContainer, { bottom }, animatedStyle]}
    >
      <View
        pointerEvents="none"
        style={[styles.gradient, { bottom: -bottom, height: gradientHeight + bottom }]}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <SvgLinearGradient id="videoCaptionGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity="0.1" />
              <Stop offset="0.55" stopColor="#000000" stopOpacity="0.35" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0.6" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#videoCaptionGradient)" />
        </Svg>
      </View>

      <Animated.View layout={LinearTransition.duration(280)} style={styles.captionContent}>
        {title.trim() ? (
          <Text style={[styles.title, { color: "#ffffff" }]} numberOfLines={2}>
            {title.trim()}
          </Text>
        ) : null}

        {hasDescription ? (
          <Text
            style={[styles.description, { color: "#ffffff" }]}
            numberOfLines={expanded ? undefined : 2}
            onTextLayout={(event) => {
              const lineCount = event.nativeEvent.lines.length;
              setDescriptionHeight(Math.max(50, lineCount * 25 + 12));
            }}
          >
            {cleanDescription}
          </Text>
        ) : null}

        {hasDescription ? (
          <Pressable
            onPress={() => setExpanded((current) => !current)}
            style={styles.moreButton}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Свий описанието" : "Покажи цялото описание"}
          >
            <Text style={[styles.moreButtonText, { color: "#ffffff" }]}>
              {expanded ? "по-малко" : "още"}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  triggerContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 30,
    overflow: "visible",
  },
  gradient: { position: "absolute", left: -16, right: -16, bottom: 0, zIndex: 1 },
  captionContent: { alignItems: "flex-start", zIndex: 2 },
  title: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    maxWidth: "100%",
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  moreButton: { marginTop: 2, paddingVertical: 4, paddingRight: 8 },
  moreButtonText: {
    fontSize: 12,
    fontWeight: "800",
    textDecorationLine: "underline",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
