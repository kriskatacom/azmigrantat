import { FontAwesome } from "@expo/vector-icons";
import type { ChatAttachmentUpload } from "@/types/chat";
import { type RefObject, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import AudioMessageRecorder from "./audio-message-recorder";
import ChatMoreOptionsModal from "./chat-more-options-modal";

type ChatInputProps = {
  value: string;
  isSending: boolean;
  keyboardVisible: boolean;
  inputRef: RefObject<TextInput | null>;

  onChangeText: (value: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onSendAudio: (attachments: ChatAttachmentUpload[]) => Promise<boolean>;

  colors: {
    card: string;
    border: string;
    background: string;
    text: string;
    placeholder: string;
    button: string;
    buttonText: string;
    textSecondary: string;
  };
};

export default function ChatInput({
  value,
  isSending,
  keyboardVisible,
  inputRef,
  onChangeText,
  onSend,
  onAttach,
  onSendAudio,
  colors,
}: ChatInputProps) {
  const canSend = Boolean(value.trim()) && !isSending;
  const [isRecording, setIsRecording] = useState(false);
  const [audioStartRequestId, setAudioStartRequestId] = useState(0);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);

  const openMoreMenu = () => {
    if (isSending) return;
    setIsMoreMenuVisible(true);
  };

  return (
    <View
      style={[
        styles.inputContainer,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === "ios" ? 28 : keyboardVisible ? 8 : 60,
        },
      ]}
    >
      {!isRecording ? <><TouchableOpacity
        onPress={openMoreMenu}
        disabled={isSending}
        style={[styles.attachButton, { backgroundColor: colors.background }]}
        accessibilityRole="button"
        accessibilityLabel="Покажи още опции за изпращане"
      >
        <FontAwesome name="ellipsis-h" size={21} color={colors.button} />
      </TouchableOpacity>

      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            color: colors.text,
          },
        ]}
        placeholder="Напиши съобщение..."
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline
        maxLength={10000}
        editable
      />

      <TouchableOpacity
        onPress={onSend}
        disabled={!canSend}
        style={[
          styles.sendButton,
          {
            backgroundColor: canSend ? colors.button : colors.textSecondary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Изпрати съобщението"
      >
        {isSending ? (
          <ActivityIndicator size="small" color={colors.buttonText} />
        ) : (
          <FontAwesome name="send" size={18} color={colors.buttonText} />
        )}
      </TouchableOpacity></> : null}

      <AudioMessageRecorder
        disabled={isSending}
        startRequestId={audioStartRequestId}
        onRecordingChange={setIsRecording}
        onSend={onSendAudio}
        colors={colors}
      />

      <ChatMoreOptionsModal
        visible={isMoreMenuVisible}
        onClose={() => setIsMoreMenuVisible(false)}
        onAudioPress={() =>
          setAudioStartRequestId((current) => current + 1)
        }
        onAttachmentPress={onAttach}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    borderTopWidth: 1,
    alignItems: "center",
  },

  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    marginRight: 10,
  },

  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
