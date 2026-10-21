import type { LiveComment } from "@/types/live";
import RemoteImage from "@/components/ui/RemoteImage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function LiveCommentTicker({
  comment,
  bottomOffset = 92,
}: {
  comment: LiveComment | null;
  bottomOffset?: number;
}) {
  const [visibleComments, setVisibleComments] = useState<LiveComment[]>([]);

  useEffect(() => {
    if (!comment) return;

    setVisibleComments((current) => {
      if (current.some((item) => item.id === comment.id)) {
        return current;
      }

      return [...current, comment].slice(-5);
    });
  }, [comment]);

  if (visibleComments.length === 0) return null;

  return (
    <View pointerEvents="none" style={[styles.container, { bottom: bottomOffset }]}>
      {visibleComments.map((visibleComment) => (
        <View key={visibleComment.id} style={styles.commentRow}>
          {visibleComment.user?.profile_image ? (
            <RemoteImage uri={visibleComment.user.profile_image} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={18} color="#ffffff" />
            </View>
          )}
          <View style={styles.copy}>
            <Text style={styles.name} numberOfLines={1}>
              {visibleComment.user?.name ?? "Потребител"}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {visibleComment.body}
            </Text>
          </View>
        </View>
      ))}
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
    gap: 7,
    zIndex: 8,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: "#ffffff" },
  avatarFallback: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#475569", borderWidth: 1, borderColor: "#ffffff" },
  copy: { flex: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(8, 12, 24, 0.48)" },
  name: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  body: { color: "#ffffff", fontSize: 13, lineHeight: 17, marginTop: 1 },
});
