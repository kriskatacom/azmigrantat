import type { ChatAttachmentUpload } from "@/types/chat";
import { FontAwesome } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File } from "expo-file-system";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MAX_RECORDING_SECONDS = 5 * 60;

type AudioMessageRecorderProps = {
  disabled: boolean;
  startRequestId: number;
  onRecordingChange: (isRecording: boolean) => void;
  onSend: (attachments: ChatAttachmentUpload[]) => Promise<boolean>;
  colors: {
    background: string;
    button: string;
    buttonText: string;
    text: string;
    textSecondary: string;
  };
};

function formatDuration(durationMillis: number) {
  const totalSeconds = Math.floor(durationMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function openMicrophoneSettings() {
  try {
    await Linking.openSettings();
  } catch {
    Alert.alert(
      "Настройките не се отвориха",
      "Отворете настройките на телефона и разрешете достъпа до микрофона за приложението.",
    );
  }
}

export default function AudioMessageRecorder({
  disabled,
  startRequestId,
  onRecordingChange,
  onSend,
  colors,
}: AudioMessageRecorderProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const handledStartRequestRef = useRef(0);
  const [isActive, setIsActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordedAttachment, setRecordedAttachment] =
    useState<ChatAttachmentUpload | null>(null);

  const startRecording = useCallback(async () => {
    if (disabled || isSubmitting || isActive) return;

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Нужен е достъп до микрофона",
          "Отворете настройките на приложението и разрешете достъпа до микрофона.",
          [
            { text: "Отказ", style: "cancel" },
            {
              text: "Отвори настройките",
              onPress: () => void openMicrophoneSettings(),
            },
          ],
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsActive(true);
      onRecordingChange(true);
    } catch (error) {
      Alert.alert(
        "Записът не стартира",
        error instanceof Error ? error.message : "Възникна неочаквана грешка.",
      );
    }
  }, [disabled, isActive, isSubmitting, onRecordingChange, recorder]);

  useEffect(() => {
    if (
      startRequestId <= 0 ||
      handledStartRequestRef.current === startRequestId
    )
      return;

    handledStartRequestRef.current = startRequestId;
    void startRecording();
  }, [startRecording, startRequestId]);

  const stopRecording = useCallback(async () => {
    if (!isActive || isSubmitting) {
      return;
    }

    try {
      await recorder.stop();

      await setAudioModeAsync({
        allowsRecording: false,
      });

      const uri = recorder.uri;

      if (!uri) {
        throw new Error("Записът не можа да бъде създаден.");
      }

      const file = new File(uri);

      // Android понякога има нужда от съвсем кратък момент
      // след stop(), преди размерът да стане достъпен.
      if (!file.exists || file.size <= 0) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const readyFile = new File(uri);

      if (!readyFile.exists || readyFile.size <= 0) {
        throw new Error("Записаният аудио файл е празен или невалиден.");
      }

      const extension = readyFile.extension?.replace(".", "") || "m4a";

      const mimeType = readyFile.type || "audio/mp4";

      setRecordedAttachment({
        uri,
        name: `voice-message-${Date.now()}.${extension}`,
        mimeType,
        size: readyFile.size,
      });

      setIsActive(false);
    } catch (error) {
      Alert.alert(
        "Записът не можа да бъде спрян",
        error instanceof Error ? error.message : "Възникна неочаквана грешка.",
      );
    }
  }, [isActive, isSubmitting, recorder]);

  const sendRecording = useCallback(async () => {
    if (!recordedAttachment || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const sent = await onSend([recordedAttachment]);

      if (!sent) {
        return;
      }

      setRecordedAttachment(null);
      onRecordingChange(false);
    } catch (error) {
      Alert.alert(
        "Аудиото не беше изпратено",
        error instanceof Error ? error.message : "Възникна неочаквана грешка.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [recordedAttachment, isSubmitting, onRecordingChange, onSend]);

  useEffect(() => {
    if (
      isActive &&
      recorderState.durationMillis >= MAX_RECORDING_SECONDS * 1000
    ) {
      void stopRecording();
    }
  }, [stopRecording, isActive, recorderState.durationMillis]);

  const cancelRecording = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      if (isActive) {
        await recorder.stop();

        await setAudioModeAsync({
          allowsRecording: false,
        });
      }

      setRecordedAttachment(null);
    } catch (error) {
      console.error("Cancel recording error:", error);
    } finally {
      setIsActive(false);
      onRecordingChange(false);
    }
  };

  if (!isActive && !recordedAttachment) {
    return null;
  }

  return (
    <View style={[styles.recordingBar, { backgroundColor: colors.background }]}>
      <View style={styles.recordingStatus}>
        <View style={styles.recordingDot} />
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.duration, { color: colors.text }]}
        >
          {formatDuration(recorderState.durationMillis)}
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {isActive ? "Запис" : "Готово за изпращане"}
        </Text>
      </View>

      <TouchableOpacity
        accessibilityLabel="Откажи аудио записа"
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={() => void cancelRecording()}
        style={styles.actionButton}
      >
        <FontAwesome name="trash-o" size={20} color="#ef4444" />
      </TouchableOpacity>

      {isActive ? (
        <TouchableOpacity
          accessibilityLabel="Спри аудио записа"
          accessibilityRole="button"
          onPress={() => void stopRecording()}
          style={[
            styles.circleButton,
            {
              backgroundColor: "#ef4444",
            },
          ]}
        >
          <FontAwesome name="stop" size={16} color="#ffffff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          accessibilityLabel="Изпрати аудио съобщението"
          accessibilityRole="button"
          disabled={isSubmitting || !recordedAttachment}
          onPress={() => void sendRecording()}
          style={[
            styles.circleButton,
            {
              backgroundColor: colors.button,
            },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.buttonText} />
          ) : (
            <FontAwesome name="send" size={17} color={colors.buttonText} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recordingBar: {
    flex: 1,
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 2,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  recordingStatus: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#ef4444",
  },
  duration: {
    minWidth: 38,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  hint: {
    fontSize: 13,
  },
  actionButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
