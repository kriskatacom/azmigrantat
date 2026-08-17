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
  isImage: boolean;
  fileName: string;
  onClose: () => void;
  onDownload: () => void;
  onSaveToGallery: () => void;
  colors: {
    card: string;
    border: string;
    text: string;
    textSecondary: string;
    primary: string;
  };
};

export default function ChatDownloadOptionsModal({
  visible,
  isImage,
  fileName,
  onClose,
  onDownload,
  onSaveToGallery,
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
        accessibilityLabel="Затвори менюто за сваляне"
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
            Сваляне
          </Text>
          <Text
            numberOfLines={2}
            selectable
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            {fileName}
          </Text>

          <Option
            icon="download"
            label="Свали или запази файла"
            onPress={() => select(onDownload)}
            colors={colors}
          />

          {isImage ? (
            <Option
              icon="image"
              label="Запази в галерията"
              onPress={() => select(onSaveToGallery)}
              colors={colors}
            />
          ) : null}

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
  icon: "download" | "image";
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
      <View style={[styles.icon, { backgroundColor: `${colors.primary}18` }]}>
        <FontAwesome name={icon} size={20} color={colors.primary} />
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
