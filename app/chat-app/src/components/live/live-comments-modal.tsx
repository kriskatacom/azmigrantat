import { useAppTheme } from "@/app/_layout";
import LiveCommentComposer from "@/components/live/live-comment-composer";
import LiveCommentList from "@/components/live/live-comment-list";
import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import type { LiveComment } from "@/types/live";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LiveCommentsModal({
  visible,
  comments,
  onClose,
  onPressUser,
  comment,
  onChangeComment,
  onSendComment,
}: {
  visible: boolean;
  comments: LiveComment[];
  onClose: () => void;
  onPressUser?: (userId: number) => void;
  comment: string;
  onChangeComment: (value: string) => void;
  onSendComment: () => void;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { keyboardVisible } = useChatKeyboard();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.colors.background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Коментари</Text>
            <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Затвори коментарите">
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          <LiveCommentList comments={comments} onPressUser={onPressUser} />
          <LiveCommentComposer
            value={comment}
            placeholder="Напиши коментар"
            onChangeText={onChangeComment}
            onSend={onSendComment}
            keyboardVisible={keyboardVisible}
            showSendButton={keyboardVisible}
            colors={theme.colors}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" },
  panel: { height: "78%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: "800" },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
