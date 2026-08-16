import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type IncomingCallProps = {
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
};

export default function IncomingCall({ visible, onAccept, onReject }: IncomingCallProps) {
  return (
    <Modal animationType="fade" onRequestClose={onReject} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text selectable style={styles.title}>Входящо видео обаждане</Text>
          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" onPress={onReject} style={[styles.button, styles.rejectButton]}>
              <Text style={styles.buttonText}>Откажи</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={onAccept} style={[styles.button, styles.acceptButton]}>
              <Text style={styles.buttonText}>Приеми</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(0, 0, 0, 0.72)" },
  card: { width: "100%", maxWidth: 380, padding: 24, borderRadius: 20, gap: 24, backgroundColor: "#18181b" },
  title: { color: "#ffffff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  actions: { flexDirection: "row", gap: 12 },
  button: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  rejectButton: { backgroundColor: "#ef4444" },
  acceptButton: { backgroundColor: "#22c55e" },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});
