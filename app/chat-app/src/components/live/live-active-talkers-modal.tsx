import { useAppTheme } from "@/app/_layout";
import RemoteImage from "@/components/ui/RemoteImage";
import type { LiveTalkRequestUpdatedPayload } from "@/services/socket";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LiveActiveTalkersModal({
  visible,
  talkers,
  onClose,
  onRemove,
  onPressUser,
}: {
  visible: boolean;
  talkers: LiveTalkRequestUpdatedPayload[];
  onClose: () => void;
  onRemove: (requestId: string) => void;
  onPressUser: (userId: number) => void;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Затвори активните разговори"
        />
        <View style={[styles.panel, { backgroundColor: theme.colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}> 
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.colors.text }]}>Активни разговори</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {talkers.length} {talkers.length === 1 ? "участник" : "участници"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Затвори активните разговори">
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {talkers.map((talker) => (
              <View key={talker.request_id} style={[styles.row, { backgroundColor: theme.colors.card }]}>
                <Pressable style={styles.user} onPress={() => onPressUser(talker.viewer.id)} accessibilityRole="button">
                  {talker.viewer.profile_image ? (
                    <RemoteImage uri={talker.viewer.profile_image} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={20} color="#ffffff" />
                    </View>
                  )}
                  <View style={styles.userText}>
                    <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{talker.viewer.name}</Text>
                    <Text style={styles.status}>Говори в момента</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={styles.remove}
                  onPress={() => onRemove(talker.request_id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Премахни ${talker.viewer.name} от разговора`}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" },
  panel: { maxHeight: "70%", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { marginTop: 3, fontSize: 13 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  list: { gap: 10, paddingBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 10 },
  user: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#475569" },
  userText: { flex: 1 },
  name: { fontSize: 15, fontWeight: "800" },
  status: { color: "#16a34a", fontSize: 12, fontWeight: "700", marginTop: 3 },
  remove: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
