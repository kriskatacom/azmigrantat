import { useAppTheme } from "@/app/_layout";
import type { LiveComment } from "@/types/live";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function LiveCommentList({ comments }: { comments: LiveComment[] }) {
  const { theme } = useAppTheme();

  return (
    <FlatList
      data={comments}
      keyExtractor={(item) => String(item.id)}
      style={styles.list}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {item.user?.name ?? "Потребител"}
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{item.body}</Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
          Все още няма коментари.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingVertical: 8, gap: 8 },
  row: { paddingHorizontal: 4 },
  name: { fontSize: 13, fontWeight: "700" },
  body: { fontSize: 14, marginTop: 2 },
  empty: { textAlign: "center", marginTop: 12 },
});
