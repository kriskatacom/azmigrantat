import { useAppTheme } from "@/app/_layout";
import RemoteImage from "@/components/ui/RemoteImage";
import type { LiveComment } from "@/types/live";
import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export default function LiveCommentList({ comments }: { comments: LiveComment[] }) {
  const { theme } = useAppTheme();
  const listRef = useRef<FlatList<LiveComment>>(null);

  useEffect(() => {
    if (comments.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);

    return () => clearTimeout(timer);
  }, [comments.length]);

  return (
    <FlatList
      ref={listRef}
      data={comments}
      keyExtractor={(item) => String(item.id)}
      style={styles.list}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const name = item.user?.name ?? "Потребител";
        const image = item.user?.profile_image ?? null;

        return (
          <View style={styles.row}>
            {image ? (
              <RemoteImage uri={image} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.avatarLetter}>{initials(name)}</Text>
              </View>
            )}
            <View style={[styles.bubble, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[styles.body, { color: theme.colors.text }]}>{item.body}</Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <FontAwesome name="comments-o" size={28} color={theme.colors.textSecondary} />
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            Напиши първия коментар.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 10, gap: 10, flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "92%" },
  avatar: { width: 32, height: 32, borderRadius: 16, overflow: "hidden" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  bubble: {
    flexShrink: 1,
    borderRadius: 16,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  name: { fontSize: 12, fontWeight: "800", marginBottom: 2, opacity: 0.78 },
  body: { fontSize: 15, lineHeight: 20 },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingTop: 24, gap: 10 },
  empty: { fontSize: 14, textAlign: "center" },
});
