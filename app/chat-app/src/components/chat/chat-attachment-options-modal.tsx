import { FontAwesome } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCameraPress: () => void;
  onPhotosPress: () => void;
  onFilePress: () => void;
  colors: {
    card: string;
    border: string;
    text: string;
    textSecondary: string;
    button: string;
  };
};

export default function ChatAttachmentOptionsModal({
  visible,
  onClose,
  onCameraPress,
  onPhotosPress,
  onFilePress,
  colors,
}: Props) {
  const select = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Затвори менюто за прикачени файлове"
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
          <Text selectable style={[styles.title, { color: colors.text }]}>
            Снимка или файл
          </Text>
          <Text
            selectable
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            Изберете откъде да добавите прикачения файл.
          </Text>

          <Option
            icon="camera"
            label="Камера"
            onPress={() => select(onCameraPress)}
            colors={colors}
          />
          <Option
            icon="image"
            label="Снимки"
            onPress={() => select(onPhotosPress)}
            colors={colors}
          />
          <Option
            icon="file-o"
            label="Файл"
            onPress={() => select(onFilePress)}
            colors={colors}
          />

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

type OptionProps = {
  icon: "camera" | "image" | "file-o";
  label: string;
  onPress: () => void;
  colors: Props["colors"];
};

function Option({ icon, label, onPress, colors }: OptionProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={styles.option}
    >
      <View style={[styles.icon, { backgroundColor: `${colors.button}18` }]}>
        <FontAwesome name={icon} size={20} color={colors.button} />
      </View>
      <Text style={[styles.optionText, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
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
  title: { fontSize: 20, fontWeight: "800", textAlign: "left" },
  subtitle: { paddingBottom: 10, fontSize: 14, textAlign: "left" },
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
  optionText: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "left" },
  cancel: {
    minHeight: 48,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 4,
  },
  cancelText: { fontSize: 15, fontWeight: "600", textAlign: "left" },
});
