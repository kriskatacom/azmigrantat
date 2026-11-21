import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  rightInset?: number;
  onDescriptionScrollChange?: (isScrolling: boolean) => void;
};

export default function VideoCaption({
  title,
  description,
  visible = true,
  bottomOffset = 0,
  interactionKey = 0,
  isPlaying = false,
  rightInset = 16,
  maxHeight = 280,
  onDescriptionScrollChange,
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
    if (!visible || !isPlaying || expanded) {
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
  }, [expanded, interactionKey, isPlaying, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!hasContent) return null;

  const bottom = Math.max(insets.bottom + 8, 24, bottomOffset);
  const gradientHeight = Math.max(72, Math.min(descriptionHeight + 20, 280));
  const keepCaptionVisible = () => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    setAutoHidden(false);
  };
  const toggleDescription = () => setExpanded((current) => !current);
  const descriptionViewportHeight = Math.max(96, maxHeight - 72);

  return (
    <Animated.View
      pointerEvents={visible && !autoHidden ? "box-none" : "none"}
      layout={LinearTransition.duration(280)}
      style={[styles.triggerContainer, { right: rightInset, bottom }, animatedStyle]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.gradient,
          { right: -rightInset, bottom: -bottom, height: gradientHeight + bottom },
        ]}
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
        <Pressable
          disabled={!hasDescription}
          onPressIn={hasDescription ? keepCaptionVisible : undefined}
          onPress={hasDescription ? toggleDescription : undefined}
          style={styles.captionTextButton}
          accessibilityRole={hasDescription ? "button" : undefined}
          accessibilityLabel={hasDescription
            ? (expanded ? "Свий описанието" : "Покажи цялото описание")
            : undefined}
        >
          {title.trim() ? (
            <Text style={[styles.title, { color: "#ffffff" }]} numberOfLines={2}>
              {title.trim()}
            </Text>
          ) : null}
        </Pressable>

        {hasDescription && !expanded ? (
          <Pressable
            onPressIn={keepCaptionVisible}
            onPress={toggleDescription}
            style={styles.captionTextButton}
            accessibilityRole="button"
            accessibilityLabel="Покажи цялото описание"
          >
            <Text
              style={[styles.description, { color: "#ffffff" }]}
              numberOfLines={2}
              onTextLayout={(event) => {
                const lineCount = event.nativeEvent.lines.length;
                setDescriptionHeight(Math.max(50, lineCount * 25 + 12));
              }}
            >
              {cleanDescription}
            </Text>
          </Pressable>
        ) : null}

        {hasDescription && expanded ? (
          <ScrollView
            style={[styles.expandedDescription, { maxHeight: descriptionViewportHeight }]}
            contentContainerStyle={styles.expandedDescriptionContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            persistentScrollbar
            onTouchStart={() => {
              keepCaptionVisible();
              onDescriptionScrollChange?.(true);
            }}
            onTouchEnd={() => onDescriptionScrollChange?.(false)}
            onTouchCancel={() => onDescriptionScrollChange?.(false)}
            onScrollBeginDrag={() => onDescriptionScrollChange?.(true)}
            onScrollEndDrag={() => onDescriptionScrollChange?.(false)}
            onMomentumScrollEnd={() => onDescriptionScrollChange?.(false)}
          >
            <Pressable onPress={toggleDescription} accessibilityRole="button" accessibilityLabel="Свий описанието">
              <Text
                style={[styles.description, styles.expandedDescriptionText, { color: "#ffffff" }]}
                onTextLayout={(event) => {
                  const lineCount = event.nativeEvent.lines.length;
                  setDescriptionHeight(Math.max(50, lineCount * 25 + 12));
                }}
              >
                {cleanDescription}
              </Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {hasDescription ? (
          <Pressable
            onPressIn={keepCaptionVisible}
            onPress={toggleDescription}
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
    zIndex: 30,
    elevation: 10_010,
    overflow: "visible",
  },
  gradient: { position: "absolute", left: -16, bottom: 0, zIndex: 1 },
  captionContent: { alignItems: "flex-start", zIndex: 2 },
  captionTextButton: { alignSelf: "stretch" },
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
  expandedDescription: {
    alignSelf: "stretch",
    marginTop: 3,
  },
  expandedDescriptionContent: { paddingRight: 8, paddingBottom: 4 },
  expandedDescriptionText: { marginTop: 0 },
  moreButton: {
    minHeight: 36,
    marginTop: 2,
    marginLeft: -10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
    zIndex: 31,
    elevation: 10_011,
  },
  moreButtonText: {
    fontSize: 12,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
