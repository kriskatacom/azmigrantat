import type { LiveComment } from "@/types/live";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function LiveCommentTicker({
  comment,
  bottomOffset = 92,
}: {
  comment: LiveComment | null;
  bottomOffset?: number;
}) {
  const [visibleComment, setVisibleComment] = useState<LiveComment | null>(null);

  useEffect(() => {
    if (!comment) return;

    setVisibleComment(comment);
    const timer = setTimeout(() => {
      setVisibleComment((current) => (current?.id === comment.id ? null : current));
    }, 5_000);

    return () => clearTimeout(timer);
  }, [comment]);

  if (!visibleComment) return null;

  return (
    <View pointerEvents="none" style={[styles.container, { bottom: bottomOffset }]}>
      <Text style={styles.name} numberOfLines={1}>
        {visibleComment.user?.name ?? "Потребител"}
      </Text>
      <Text style={styles.body} numberOfLines={3}>
        {visibleComment.body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 70,
    alignSelf: "flex-start",
    maxWidth: "88%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(8, 12, 24, 0.72)",
    zIndex: 8,
  },
  name: { color: "rgba(255,255,255,0.78)", fontSize: 12, fontWeight: "800" },
  body: { color: "#ffffff", fontSize: 15, lineHeight: 20, marginTop: 2 },
});
