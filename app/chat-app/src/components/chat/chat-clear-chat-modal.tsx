import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type ClearChatScope = "me" | "both";
export type ClearChatMessages = "mine" | "all";

type Step = "audience" | "messages";

type ChatClearChatModalProps = {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (scope: ClearChatScope, messages: ClearChatMessages) => void;
  colors: {
    card: string;
    border: string;
    text: string;
    textSecondary: string;
    button: string;
    danger: string;
  };
};

export default function ChatClearChatModal({
  visible,
  busy = false,
  onClose,
  onConfirm,
  colors,
}: ChatClearChatModalProps) {
  const [step, setStep] = useState<Step>("audience");
  const [scope, setScope] = useState<ClearChatScope | null>(null);

  useEffect(() => {
    if (visible) {
      setStep("audience");
      setScope(null);
    }
  }, [visible]);

  const selectScope = (nextScope: ClearChatScope) => {
    setScope(nextScope);
    setStep("messages");
  };

  const selectMessages = (messages: ClearChatMessages) => {
    if (!scope || busy) {
      return;
    }

    onConfirm(scope, messages);
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Затвори"
        onPress={busy ? undefined : onClose}
        style={styles.backdrop}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.dialog,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Изтриване на чата
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === "audience"
              ? "За кого да се изтрие?"
              : "Кои съобщения да се премахнат?"}
          </Text>

          {step === "audience" ? (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => selectScope("both")}
                style={styles.option}
              >
                <View
                  style={[styles.icon, { backgroundColor: `${colors.danger}18` }]}
                >
                  <FontAwesome name="users" size={18} color={colors.danger} />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    За двамата
                  </Text>
                  <Text
                    style={[styles.optionHint, { color: colors.textSecondary }]}
                  >
                    Промяната ще важи и за другия човек
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => selectScope("me")}
                style={styles.option}
              >
                <View
                  style={[styles.icon, { backgroundColor: `${colors.button}18` }]}
                >
                  <FontAwesome name="user" size={18} color={colors.button} />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    Само за мен
                  </Text>
                  <Text
                    style={[styles.optionHint, { color: colors.textSecondary }]}
                  >
                    Другият ще продължи да вижда историята
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={() => selectMessages("mine")}
                style={styles.option}
              >
                <View
                  style={[styles.icon, { backgroundColor: `${colors.button}18` }]}
                >
                  <FontAwesome
                    name="comment"
                    size={18}
                    color={colors.button}
                  />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    Само моите
                  </Text>
                  <Text
                    style={[styles.optionHint, { color: colors.textSecondary }]}
                  >
                    Премахват се съобщенията, които вие сте изпратили
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={() => selectMessages("all")}
                style={styles.option}
              >
                <View
                  style={[styles.icon, { backgroundColor: `${colors.danger}18` }]}
                >
                  <FontAwesome name="trash" size={18} color={colors.danger} />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    Всички съобщения
                  </Text>
                  <Text
                    style={[styles.optionHint, { color: colors.textSecondary }]}
                  >
                    Цялата история в този чат
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              if (step === "messages") {
                setStep("audience");
                return;
              }
              onClose();
            }}
            style={styles.cancel}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              {step === "messages" ? "Назад" : "Отказ"}
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
    minHeight: 64,
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
  optionCopy: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "left",
  },
  optionHint: {
    marginTop: 2,
    fontSize: 13,
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
