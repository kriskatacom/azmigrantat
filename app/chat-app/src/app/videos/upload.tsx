import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import VideoUploadProgressOverlay, { VideoUploadStage } from "@/components/video/video-upload-progress-overlay";
import { useAuth } from "@/hooks/useAuth";
import { beginVideoUpload, cancelActiveVideoUpload, completeVideoUpload, deleteVideo, getNativeFileSize, uploadVideoThumbnail, uploadVideoWithTus } from "@/services/videos";
import { getPublicProfile } from "@/services/profile";
import { getCategories, getRootCategories, type Category } from "@/services/categories";
import {
  getBackgroundUploadStatus,
  setBackgroundUploadActive,
  subscribeToBackgroundUpload,
  updateBackgroundUpload,
} from "@/services/background-upload-state";
import { File } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableHighlight, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function VideoUploadScreen() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [categoryHasChildren, setCategoryHasChildren] = useState<Record<number, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryPath, setCategoryPath] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [selected, setSelected] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [thumbnail, setThumbnail] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [backgroundStatus, setBackgroundStatus] = useState(getBackgroundUploadStatus);
  const [stage, setStage] = useState<VideoUploadStage>("preparing");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const uploadStarted = useRef(false);
  const startedAt = useRef<number | null>(null);
  const activeVideoId = useRef<number | null>(null);

  useEffect(() => subscribeToBackgroundUpload(setBackgroundStatus), []);

  useEffect(() => {
    const controller = new AbortController();
    setIsCategoriesLoading(true);
    void getRootCategories(controller.signal)
      .then((response) => {
        setRootCategories(response.items);
        setCategories(response.items);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        console.warn("[VideoUpload] Категориите не можаха да се заредят.", error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsCategoriesLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (categories.length === 0) {
      setCategoryHasChildren({});
      return;
    }

    const controller = new AbortController();
    void Promise.all(
      categories.map(async (category) => {
        try {
          const response = await getCategories(category.id, controller.signal);
          return [category.id, response.items.length > 0] as const;
        } catch (error) {
          if (!(error instanceof Error && error.name === "AbortError")) {
            console.warn("[VideoUpload] Подкатегориите не можаха да се проверят.", error);
          }
          return [category.id, Boolean(category.children_count && category.children_count > 0)] as const;
        }
      }),
    ).then((entries) => {
      if (!controller.signal.aborted) setCategoryHasChildren(Object.fromEntries(entries));
    });

    return () => controller.abort();
  }, [categories]);

  useEffect(() => {
    if (!busy && !backgroundStatus.active) return;

    const updateElapsed = () => {
      const startedAtMs = startedAt.current ?? getBackgroundUploadStatus().startedAtMs;
      if (startedAtMs === null) return;

      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      const currentProgress = getBackgroundUploadStatus().progress;
      setElapsedSeconds(elapsed);
      updateBackgroundUpload({
        elapsedSeconds: elapsed,
        remainingSeconds:
          currentProgress > 0 && elapsed > 0
            ? Math.max(0, Math.ceil((elapsed * (100 - currentProgress)) / currentProgress))
            : null,
      });
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [backgroundStatus.active, busy]);

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
        if (video.status === "failed") throw new Error("Обработката на видеото не успя.");
      } catch (error) {
        if (error instanceof Error && (error.message.includes("вече не съществува") || error.message.includes("Обработката на видеото не успя"))) {
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
    setOverlayVisible(true);
    setBackgroundUploadActive(false);
    updateBackgroundUpload({
      progress: 0,
      stage: "preparing",
      elapsedSeconds: 0,
      remainingSeconds: null,
      startedAtMs: startedAt.current,
    });
    setProgress(0);
    setElapsedSeconds(0);
    setStage("preparing");
    try {
      const file = new File(selected.uri);
      const fileSize = getNativeFileSize(file);
      if (!fileSize) {
        throw new Error("Локалният файл не може да бъде прочетен.");
      }
      let thumbnailUri = thumbnail?.uri ?? null;
      if (!thumbnailUri) {
        try {
          const generatedThumbnail = await VideoThumbnails.getThumbnailAsync(selected.uri, {
            time: 1000,
            quality: 0.8,
          });
          thumbnailUri = generatedThumbnail.uri;
        } catch (error) {
          console.warn("[VideoUpload] Неуспешно генериране на thumbnail; продължаваме без него.", error);
        }
      }
      const initialized = await beginVideoUpload(token, {
        title: title.trim() || selected.name,
        description: description.trim(),
        categoryId: selectedCategory?.id ?? null,
        filename: selected.name,
        mimeType: selected.mimeType ?? "video/mp4",
        fileSize,
      });
      activeVideoId.current = initialized.data.video.id;
      setStage("uploading");
      updateBackgroundUpload({ stage: "uploading" });
      await uploadVideoWithTus(file, initialized.data.upload, (percentage) => {
        setProgress(percentage);
        updateBackgroundUpload({ progress: percentage });
      }, {
        cancelUrl: `${process.env.EXPO_PUBLIC_API_URL}/api/mobile/videos/${initialized.data.video.id}`,
        authToken: token,
      });
      setProgress(100);
      setStage("processing");
      updateBackgroundUpload({ progress: 100, stage: "processing", remainingSeconds: null });
      await completeVideoUpload(token, initialized.data.video.id);
      if (thumbnailUri) {
        await uploadVideoThumbnail(token, initialized.data.video.id, {
          uri: thumbnailUri,
          name: thumbnail?.fileName ?? "video-thumbnail.jpg",
          mimeType: thumbnail?.mimeType ?? "image/jpeg",
        });
      }
      await waitForVideoReady(initialized.data.video.id);
      setBusy(false);
      setOverlayVisible(false);
      setBackgroundUploadActive(false);
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (user?.id) {
        router.replace({
          pathname: "/user/[id]/videos",
          params: { id: String(user.id) },
        });
      } else {
        router.replace("/");
      }
    } catch (error) {
      uploadStarted.current = false;
      console.error("[VideoUpload] Качването на видеото не успя.", error);
    } finally {
      setBusy(false);
      setOverlayVisible(false);
      setBackgroundUploadActive(false);
      updateBackgroundUpload({ startedAtMs: null });
      startedAt.current = null;
    }
  }

  async function chooseThumbnailFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Нужен е достъп до снимките", "Разрешете достъп до снимките от настройките на телефона.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [9, 16], quality: 0.9 });
    if (!result.canceled) setThumbnail(result.assets[0]);
  }

  function cancelUpload() {
    if (!token || !activeVideoId.current) return;

    Alert.alert(
      "Прекратяване на качването",
      "Видеото ще бъде изтрито окончателно. Искате ли да продължите?",
      [
        { text: "Отказ", style: "cancel" },
        {
          text: "Прекрати и изтрий",
          style: "destructive",
          onPress: () => {
            const videoId = activeVideoId.current;
            if (!videoId) return;
            cancelActiveVideoUpload();
            void deleteVideo(token, videoId).catch((error) => {
              console.error("[VideoUpload] Видеото не можа да бъде изтрито след прекратяване.", error);
            });
            setBackgroundUploadActive(false);
            setOverlayVisible(false);
            setBusy(false);
            activeVideoId.current = null;
            router.replace("/");
          },
        },
      ],
    );
  }

  async function takeThumbnailPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Нужен е достъп до камерата", "Разрешете достъп до камерата от настройките на телефона.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });
    if (!result.canceled) setThumbnail(result.assets[0]);
  }

  function chooseThumbnail() {
    Alert.alert("Thumbnail", "Изберете източник", [
      { text: "Галерия", onPress: () => void chooseThumbnailFromLibrary() },
      { text: "Камера", onPress: () => void takeThumbnailPhoto() },
      { text: "Отказ", style: "cancel" },
    ]);
  }

  function openCategoryModal() {
    setCategoryPath([]);
    setCategories(rootCategories);
    setIsCategoryModalVisible(true);
  }

  async function chooseCategory(category: Category) {
    setIsCategoriesLoading(true);
    try {
      const response = await getCategories(category.id);
      if (response.items.length > 0) {
        setCategoryPath((currentPath) => [...currentPath, category]);
        setCategories(response.items);
        return;
      }

      setSelectedCategory(category);
      setIsCategoryModalVisible(false);
    } catch (error) {
      Alert.alert(
        "Категориите не могат да се заредят",
        error instanceof Error ? error.message : "Опитайте отново.",
      );
    } finally {
      setIsCategoriesLoading(false);
    }
  }

  async function goBackCategoryLevel() {
    if (categoryPath.length === 0 || isCategoriesLoading) return;
    setIsCategoriesLoading(true);
    try {
      const parentPath = categoryPath.slice(0, -1);
      const parentId = parentPath.length > 0 ? parentPath[parentPath.length - 1].id : null;
      const response = await getCategories(parentId);
      setCategoryPath(parentPath);
      setCategories(response.items);
    } catch (error) {
      Alert.alert(
        "Категориите не могат да се заредят",
        error instanceof Error ? error.message : "Опитайте отново.",
      );
    } finally {
      setIsCategoriesLoading(false);
    }
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
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Категория (по желание)</Text>
          <Pressable
            onPress={openCategoryModal}
            disabled={busy}
            style={[styles.fileButton, { backgroundColor: theme.colors.input, borderColor: theme.colors.inputBorder }]}
            accessibilityRole="button"
            accessibilityLabel="Избери категория за видеото"
          >
            <Text style={[styles.fileButtonText, { color: theme.colors.text }]}>
              {selectedCategory?.name ?? "Избери категория"}
            </Text>
            <Text style={[styles.fileButtonHint, { color: theme.colors.textSecondary }]}>Може да бъде променена преди качване</Text>
          </Pressable>
        </View>
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
      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.categoryBackdrop}>
          <Pressable
            style={styles.categoryDismissArea}
            onPress={() => setIsCategoryModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Затвори избора на категория"
          />
          <View
            style={[
              styles.categorySheet,
              {
                backgroundColor: theme.colors.card,
                paddingTop: insets.top + 20,
                paddingBottom: Math.max(insets.bottom, 24),
              },
            ]}
          >
            <View style={styles.categoryHeader}>
              {categoryPath.length > 0 ? (
                <Pressable
                  onPress={() => void goBackCategoryLevel()}
                  disabled={isCategoriesLoading}
                  style={styles.categoryBackButton}
                  accessibilityRole="button"
                  accessibilityLabel="Назад към предишните категории"
                >
                  <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                </Pressable>
              ) : null}
              <View style={styles.categoryHeaderText}>
                <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>Избери категория</Text>
                {categoryPath.length > 0 ? (
                  <Text style={[styles.categoryBreadcrumb, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {categoryPath.map((category) => category.name).join(" / ")}
                  </Text>
                ) : null}
              </View>
            </View>
            <ScrollView
              style={styles.categoryOptionsScroll}
              contentContainerStyle={styles.categoryOptionsContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {categoryPath.length === 0 ? (
                <TouchableHighlight
                  style={[styles.categoryOption, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                  onPress={() => {
                    setSelectedCategory(null);
                    setIsCategoryModalVisible(false);
                  }}
                  disabled={isCategoriesLoading}
                  underlayColor={theme.colors.background}
                >
                  <View style={styles.categoryOptionRow} pointerEvents="none">
                    <Text style={[styles.categoryOptionText, { color: theme.colors.text }]}>Без категория</Text>
                  </View>
                </TouchableHighlight>
              ) : null}
              {categories.map((category) => (
                <TouchableHighlight
                  key={category.id}
                  style={[styles.categoryOption, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                  onPress={() => void chooseCategory(category)}
                  disabled={isCategoriesLoading}
                  underlayColor={theme.colors.background}
                >
                  <View style={styles.categoryOptionRow} pointerEvents="none">
                    <Text style={[styles.categoryOptionText, { color: theme.colors.text }]}>{category.name}</Text>
                    {categoryHasChildren[category.id] || (category.children_count ?? 0) > 0 ? (
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    ) : null}
                  </View>
                </TouchableHighlight>
              ))}
              {isCategoriesLoading ? <ActivityIndicator style={styles.categoryLoader} color={theme.colors.primary} /> : null}
              {!isCategoriesLoading && categories.length === 0 ? <Text style={[styles.categoryEmpty, { color: theme.colors.textSecondary }]}>Няма налични категории.</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <VideoUploadProgressOverlay
        visible={(busy && overlayVisible) || backgroundStatus.active}
        progress={backgroundStatus.active ? backgroundStatus.progress : progress}
        stage={backgroundStatus.active ? backgroundStatus.stage : stage}
        elapsedSeconds={backgroundStatus.active ? backgroundStatus.elapsedSeconds : elapsedSeconds}
        remainingSeconds={backgroundStatus.active ? backgroundStatus.remainingSeconds : remainingSeconds}
        onContinueInBackground={() => {
          setOverlayVisible(false);
          setBackgroundUploadActive(true);
          router.replace({ pathname: "/", params: { backgroundUpload: "1" } });
        }}
        onCancel={cancelUpload}
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
  categoryBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.48)" },
  categoryDismissArea: { ...StyleSheet.absoluteFill },
  categorySheet: { flex: 1 },
  categoryOptionsScroll: { flex: 1 },
  categoryOptionsContent: { paddingVertical: 16 },
  categoryHeader: { minHeight: 62, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 8 },
  categoryBackButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  categoryHeaderText: { flex: 1 },
  categoryTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  categoryBreadcrumb: { fontSize: 13, marginBottom: 8 },
  categoryOption: { minHeight: 72, paddingVertical: 16, paddingHorizontal: 38, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 0 },
  categoryOptionRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  categoryOptionText: { flex: 1, fontSize: 16, fontWeight: "700" },
  categoryCheck: { fontSize: 22, fontWeight: "800" },
  categoryEmpty: { paddingVertical: 20, fontSize: 15 },
  categoryLoader: { paddingVertical: 24 },
});
