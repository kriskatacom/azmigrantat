import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function VideoCaption({
  title,
  description,
  visible = true,
  height = "20%",
  allowExpand = false,
  fitContent = false,
}: {
  title: string;
  description: string | null;
  visible?: boolean;
  height?: number | `${number}%`;
  allowExpand?: boolean;
  fitContent?: boolean;
}) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [expanded, setExpanded] = useState(false);
  const [maxCollapsedHeight, setMaxCollapsedHeight] = useState<number | null>(null);
  const [titleLineCount, setTitleLineCount] = useState(1);
  const [descriptionLineCount, setDescriptionLineCount] = useState(description ? 1 : 0);
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom + 8, 24);

  const hasMoreContent = useMemo(() => {
    const titleWords = title.trim().split(/\s+/).filter(Boolean).length;
    const descriptionWords = description?.trim().split(/\s+/).filter(Boolean).length ?? 0;
    return titleWords > 18 || descriptionWords > 24;
  }, [description, title]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [opacity, visible]);

  useEffect(() => {
    setExpanded(false);
    setMaxCollapsedHeight(null);
    setTitleLineCount(1);
    setDescriptionLineCount(description ? 1 : 0);
  }, [description, title]);

  const collapsedContentHeight =
    6 +
    titleLineCount * 23 +
    (descriptionLineCount > 0 ? 4 + descriptionLineCount * 20 : 0) +
    (allowExpand && hasMoreContent ? 4 + 28 : 0) +
    12;
  const collapsedHeight = fitContent && maxCollapsedHeight
    ? Math.min(maxCollapsedHeight, collapsedContentHeight)
    : height;

  return (
    <Animated.View
      style={[
        styles.caption,
        expanded
          ? { top: 0, bottom: bottomInset, height: undefined, opacity }
          : { height: collapsedHeight, bottom: bottomInset, opacity },
        expanded && styles.expandedCaption,
      ]}
      pointerEvents={visible ? "box-none" : "none"}
      onLayout={(event) => {
        if (fitContent && !maxCollapsedHeight) {
          setMaxCollapsedHeight(event.nativeEvent.layout.height);
        }
      }}
    >
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        pointerEvents="auto"
      >
        <Text
          style={styles.title}
          numberOfLines={expanded ? undefined : 2}
          onTextLayout={(event) => {
            setTitleLineCount(Math.min(2, event.nativeEvent.lines.length));
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={styles.description}
            numberOfLines={expanded ? undefined : 2}
            onTextLayout={(event) => {
              setDescriptionLineCount(Math.min(2, event.nativeEvent.lines.length));
            }}
          >
            {description}
          </Text>
        ) : null}
        {allowExpand && hasMoreContent ? (
          <Pressable
            style={styles.moreButton}
            onPress={() => setExpanded((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Скрий описанието" : "Вижте още"}
          >
            <Text style={styles.moreButtonText}>{expanded ? "Скрий" : "Вижте още"}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "20%",
    justifyContent: "flex-start",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  expandedCaption: {
    backgroundColor: "rgba(0,0,0,0.76)",
  },
  contentScroll: { flex: 1 },
  content: { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 12, gap: 4 },
  title: { color: "#fff", fontSize: 18, lineHeight: 23, fontWeight: "800" },
  description: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    lineHeight: 20,
  },
  moreButton: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  moreButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
