import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import { useAppTheme } from "@/app/_layout";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text } from "react-native";

export default function VideoEditModal({
  visible,
  title,
  description,
  thumbnailUri,
  busy,
  onChangeTitle,
  onChangeDescription,
  onChooseThumbnail,
  onSave,
  onCancel,
}: {
  visible: boolean;
  title: string;
  description: string;
  thumbnailUri: string | null;
  busy: boolean;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChooseThumbnail: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { theme } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.dialog, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={(event) => event.stopPropagation()}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.heading, { color: theme.colors.text }]}>Редактиране на видео</Text>
            <AppInput label="Заглавие" value={title} onChangeText={onChangeTitle} maxLength={120} />
            <AppInput
              label="Описание"
              value={description}
              onChangeText={onChangeDescription}
              multiline
              maxLength={2000}
              style={styles.descriptionInput}
              textAlignVertical="top"
            />
            <Text style={[styles.label, { color: theme.colors.text }]}>Thumbnail</Text>
            {thumbnailUri ? <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} /> : null}
            <Pressable
              onPress={onChooseThumbnail}
              disabled={busy}
              style={[styles.thumbnailButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.thumbnailButtonText, { color: theme.colors.text }]}>Избери нов thumbnail</Text>
            </Pressable>
            <AppButton title="Запази промените" loading={busy} disabled={!title.trim()} onPress={onSave} />
            <Pressable onPress={onCancel} disabled={busy} style={styles.cancel}>
              <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>Отказ</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.48)" },
  dialog: { width: "100%", maxWidth: 440, maxHeight: "90%", alignSelf: "center", borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  content: { padding: 20, gap: 4 },
  heading: { fontSize: 20, fontWeight: "800", marginBottom: 12 },
  descriptionInput: { minHeight: 100 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 7 },
  thumbnail: { width: 112, height: 72, borderRadius: 10, marginBottom: 10 },
  thumbnailButton: { minHeight: 46, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  thumbnailButtonText: { fontSize: 14, fontWeight: "700" },
  cancel: { alignItems: "center", paddingVertical: 12 },
  cancelText: { fontSize: 15, fontWeight: "700" },
});
