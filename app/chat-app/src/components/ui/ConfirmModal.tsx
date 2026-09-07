import { useAppTheme } from "@/app/_layout";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Потвърди",
  cancelText = "Отказ",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { theme } = useAppTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel={cancelText}
        onPress={onCancel}
        style={styles.backdrop}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {message}
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={onConfirm}
            style={[
              styles.confirm,
              {
                backgroundColor: destructive
                  ? `${theme.colors.danger}18`
                  : `${theme.colors.button}18`,
              },
            ]}
          >
            <Text
              style={[
                styles.confirmText,
                {
                  color: destructive ? theme.colors.danger : theme.colors.button,
                },
              ]}
            >
              {confirmText}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.cancel}
          >
            <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
              {cancelText}
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
  message: {
    paddingBottom: 10,
    fontSize: 14,
    textAlign: "left",
  },
  confirm: {
    minHeight: 56,
    borderRadius: 12,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  confirmText: {
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
