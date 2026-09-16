import { useAppTheme } from "@/app/_layout";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

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
        accessibilityRole="button"
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
          <View style={styles.header}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: destructive
                    ? `${theme.colors.danger}18`
                    : `${theme.colors.button}18`,
                },
              ]}
            >
              <FontAwesome
                name={destructive ? "trash" : "question"}
                size={18}
                color={destructive ? theme.colors.danger : theme.colors.button}
              />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          </View>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {message}
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={onConfirm}
            activeOpacity={0.82}
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
            activeOpacity={0.72}
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
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    padding: 22,
    borderWidth: 1,
    borderRadius: 26,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
    textAlign: "left",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "left",
  },
  confirm: {
    minHeight: 54,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  cancel: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});
