import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import VideoUploadProgressOverlay, { VideoUploadStage } from "@/components/video/video-upload-progress-overlay";
import { useAuth } from "@/hooks/useAuth";
import { beginVideoUpload, completeVideoUpload, getNativeFileSize, uploadVideoThumbnail, uploadVideoWithTus } from "@/services/videos";
import { getPublicProfile } from "@/services/profile";
import { File } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function VideoUploadScreen() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [thumbnail, setThumbnail] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<VideoUploadStage>("preparing");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const uploadStarted = useRef(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      if (startedAt.current !== null) {
        setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [busy]);

  const remainingSeconds = stage === "uploading" && progress > 0 && elapsedSeconds > 0
    ? Math.max(0, Math.ceil((elapsedSeconds * (100 - progress)) / progress))
    : null;

  async function waitForVideoReady(videoId: number) {
    if (!token || !user?.id) throw new Error("Липсва потребител за проверка на статуса на видеото.");

    for (;;) {
      try {
        const profile = await getPublicProfile(token, user.id);
        const video = profile.videos?.find((item) => item.id === videoId);

        if (!video) throw new Error("Видеото вече не съществува в профила.");
        if (video.status === "ready") return;
        if (video.status === "failed") throw new Error("Bunny Stream не успя да обработи видеото.");
      } catch (error) {
        if (error instanceof Error && (error.message.includes("вече не съществува") || error.message.includes("не успя да обработи"))) {
          throw error;
        }
        console.warn("[VideoUpload] Проверка на статуса не успя; ще се повтори.", error);
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  async function chooseVideo() {
    const result = await DocumentPicker.getDocumentAsync({ type: "video/*", copyToCacheDirectory: true });
    if (!result.canceled) {
      const asset = result.assets[0];
      setSelected(asset);
      if (!title.trim()) setTitle(asset.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function upload() {
    if (!token || !selected || uploadStarted.current) return;
    if (!selected.size) {
      Alert.alert("Липсва размер", "Не може да се определи размерът на видеото.");
      return;
    }

    uploadStarted.current = true;
    startedAt.current = Date.now();
    setBusy(true);
    setProgress(0);
    setElapsedSeconds(0);
    setStage("preparing");
    try {
      const file = new File(selected.uri);
      const fileSize = getNativeFileSize(file);
      if (!fileSize) {
        throw new Error("Локалният файл не може да бъде прочетен.");
      }
      const initialized = await beginVideoUpload(token, {
        title: title.trim() || selected.name,
        description: description.trim(),
        filename: selected.name,
        mimeType: selected.mimeType ?? "video/mp4",
        fileSize,
      });
      setStage("uploading");
      await uploadVideoWithTus(file, initialized.data.upload, setProgress);
      setProgress(100);
      setStage("processing");
      await completeVideoUpload(token, initialized.data.video.id);
      if (thumbnail) {
        await uploadVideoThumbnail(token, initialized.data.video.id, {
          uri: thumbnail.uri,
          name: thumbnail.fileName ?? "thumbnail.jpg",
          mimeType: thumbnail.mimeType ?? "image/jpeg",
        });
      }
      await waitForVideoReady(initialized.data.video.id);
      setBusy(false);
      await new Promise((resolve) => setTimeout(resolve, 100));
      Alert.alert(
        "Видеото е готово",
        "Видеото е качено, обработено и вече е достъпно за гледане.",
        [
          {
            text: "Към публичния ми профил",
            onPress: () => {
              if (user?.id) {
                router.replace({
                  pathname: "/user/[id]",
                  params: { id: String(user.id) },
                });
              } else {
                router.replace("/");
              }
            },
          },
        ],
      );
    } catch (error) {
      uploadStarted.current = false;
      console.error("[VideoUpload] Качването на видеото не успя.", error);
    } finally {
      setBusy(false);
      startedAt.current = null;
    }
  }

  async function chooseThumbnail() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Нужен е достъп до снимките", "Разрешете достъп до снимките от настройките на телефона.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [9, 16], quality: 0.9 });
    if (!result.canceled) setThumbnail(result.assets[0]);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title="Качи видео" hideSearchButton />
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={[styles.help, { color: theme.colors.textSecondary }]}>Качи едно видео, добави заглавие, описание и thumbnail.</Text>
        <AppInput
          label="Заглавие"
          value={title}
          onChangeText={setTitle}
          placeholder="Например: Разходка из града"
          maxLength={120}
          editable={!busy}
        />
        <AppInput
          label="Описание (по желание)"
          value={description}
          onChangeText={setDescription}
          placeholder="Добави кратко описание"
          maxLength={2000}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={styles.description}
          editable={!busy}
        />
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Видео</Text>
          <Pressable onPress={chooseVideo} disabled={busy} style={[styles.fileButton, { backgroundColor: theme.colors.input, borderColor: theme.colors.inputBorder }]}>
            <Text style={[styles.fileButtonText, { color: theme.colors.text }]}>{selected?.name ?? "Избери видео"}</Text>
            <Text style={[styles.fileButtonHint, { color: theme.colors.textSecondary }]}>Само един файл</Text>
          </Pressable>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Thumbnail (по желание)</Text>
          <Pressable onPress={chooseThumbnail} disabled={busy} style={[styles.thumbnailButton, { backgroundColor: theme.colors.input, borderColor: theme.colors.inputBorder }]}>
            {thumbnail ? <Image source={{ uri: thumbnail.uri }} style={styles.thumbnailPreview} /> : <Text style={[styles.fileButtonText, { color: theme.colors.text }]}>Добави изображение</Text>}
            {thumbnail ? <Text style={[styles.fileButtonText, { color: theme.colors.text }]}>{thumbnail.fileName ?? "Избрано изображение"}</Text> : null}
          </Pressable>
        </View>
        <AppButton title={busy ? "Качва се…" : "Качи видео"} loading={busy} disabled={!selected} onPress={() => void upload()} />
      </ScrollView>
      </KeyboardAvoidingView>
      <VideoUploadProgressOverlay
        visible={busy}
        progress={progress}
        stage={stage}
        elapsedSeconds={elapsedSeconds}
        remainingSeconds={remainingSeconds}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  keyboardAvoiding: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  help: { fontSize: 15 },
  description: { minHeight: 100, textAlignVertical: "top" },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  fileButton: { minHeight: 58, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, justifyContent: "center", gap: 3 },
  fileButtonText: { fontSize: 16 },
  fileButtonHint: { fontSize: 12 },
  thumbnailButton: { minHeight: 120, borderWidth: 1, borderRadius: 14, padding: 10, justifyContent: "center", alignItems: "center", gap: 8 },
  thumbnailPreview: { width: "100%", aspectRatio: 9 / 16, borderRadius: 10 },
});
