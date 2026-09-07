import { FontAwesome } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ChatMoreOptionsModalProps = {
  visible: boolean;
  onClose: () => void;
  onAudioPress: () => void;
  onAttachmentPress: () => void;
  colors: {
    card: string;
    border: string;
    text: string;
    textSecondary: string;
    button: string;
  };
};

export default function ChatMoreOptionsModal({
  visible,
  onClose,
  onAudioPress,
  onAttachmentPress,
  colors,
}: ChatMoreOptionsModalProps) {
  const selectAudio = () => {
    onClose();
    onAudioPress();
  };

  const selectAttachment = () => {
    onClose();
    onAttachmentPress();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Затвори менюто"
        onPress={onClose}
        style={styles.backdrop}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.dialog,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Още опции</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Какво искате да изпратите?
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={selectAudio}
            style={styles.option}
          >
            <View style={[styles.icon, { backgroundColor: `${colors.button}18` }]}>
              <FontAwesome name="microphone" size={20} color={colors.button} />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>
              Аудио съобщение
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={selectAttachment}
            style={styles.option}
          >
            <View style={[styles.icon, { backgroundColor: `${colors.button}18` }]}>
              <FontAwesome name="paperclip" size={20} color={colors.button} />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>
              Снимка или файл
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={onClose}
            style={styles.cancel}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Отказ
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    padding: 20,
    borderWidth: 1,
    borderRadius: 22,
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "left",
  },
  subtitle: {
    paddingBottom: 10,
    fontSize: 14,
    textAlign: "left",
  },
  option: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "left",
  },
  cancel: {
    minHeight: 48,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "left",
  },
});
