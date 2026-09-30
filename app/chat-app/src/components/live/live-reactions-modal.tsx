import { LIVE_REACTION_TYPES, type LiveReactionType } from "@/types/live";
import LiveReactionButton from "@/components/live/live-reaction-button";
import LiveCommentComposer from "@/components/live/live-comment-composer";
import { useAppTheme } from "@/app/_layout";
import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function LiveReactionsModal({
  visible,
  onClose,
  onReact,
  comment,
  onChangeComment,
  onSendComment,
}: {
  visible: boolean;
  onClose: () => void;
  onReact: (type: LiveReactionType) => void;
  comment: string;
  onChangeComment: (value: string) => void;
  onSendComment: () => void;
}) {
  const { theme } = useAppTheme();
  const { keyboardVisible } = useChatKeyboard();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Затвори реакциите"
        />
        <View style={styles.commentComposer}>
          <LiveCommentComposer
            value={comment}
            placeholder="Напиши коментар"
            onChangeText={onChangeComment}
            onSend={onSendComment}
            keyboardVisible={keyboardVisible}
            showSendButton={keyboardVisible}
            transparentBackground
            colors={theme.colors}
          />
        </View>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Реакции</Text>
            <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Затвори реакциите">
              <Ionicons name="close" size={24} color="#ffffff" />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            scrollEnabled
            alwaysBounceVertical
            keyboardShouldPersistTaps="handled"
          >
            {LIVE_REACTION_TYPES.map((item) => (
              <LiveReactionButton
                key={item.type}
                emoji={item.emoji}
                label={`Реакция ${item.type}`}
                onPress={() => {
                  onReact(item.type);
                }}
                size={52}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", alignItems: "center", backgroundColor: "rgba(0,0,0,0.18)" },
  panel: { width: "100%", height: "42%", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24, backgroundColor: "rgba(8,12,24,0.24)", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scroll: { flex: 1 },
  commentComposer: { width: "100%", backgroundColor: "transparent" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: "#ffffff", fontSize: 20, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 4 },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(8,12,24,0.72)" },
  grid: { width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, paddingHorizontal: 8, paddingBottom: 8 },
});
