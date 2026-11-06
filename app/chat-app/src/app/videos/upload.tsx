import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import VideoUploadProgressOverlay, { VideoUploadStage } from "@/components/video/video-upload-progress-overlay";
import { useAuth } from "@/hooks/useAuth";
import { beginVideoUpload, cancelActiveVideoUpload, completeVideoUpload, deleteVideo, getNativeFileSize, refreshVideoUploadSession, uploadVideoThumbnail, uploadVideoWithTusAndRefresh } from "@/services/videos";
import { clearPendingVideoUpload, getPendingVideoUpload, savePendingVideoUpload } from "@/services/video-upload-state";
import {
  processingTimeoutMessage,
  shouldLogVideoStatus,
  VIDEO_PROCESSING_MAX_WAIT_MS,
  VIDEO_PROCESSING_POLL_INTERVAL_MS,
} from "@/services/video-processing-polling";
import { HttpError } from "@/services/session-http";
import { getPublicProfile } from "@/services/profile";
import { getCategories, getRootCategories, type Category } from "@/services/categories";
import {
  clearVideoUploadDraft,
  loadVideoUploadDraft,
  persistDraftThumbnail,
  persistDraftVideo,
  saveVideoUploadDraft,
  type VideoUploadDraft,
} from "@/services/video-upload-draft";
import type { VideoStatus } from "@/types/video";
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
import { ActivityIndicator, Alert, Animated, Easing, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatFileSize(size?: number): string | null {
  if (!size || size <= 0) return null;

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const UPLOAD_STEPS = [
  { title: "Избери видео", icon: "cloud-upload-outline" },
  { title: "Добави информация", icon: "create-outline" },
  { title: "Избери категория", icon: "grid-outline" },
  { title: "Добави корица", icon: "image-outline" },
  { title: "Преглед и качване", icon: "checkmark-circle-outline" },
] as const;

export default function VideoUploadScreen() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const stepTranslateX = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const stepAnimationRunning = useRef(false);
  const restoredDraftUserId = useRef<number | null>(null);
  const latestDraft = useRef<VideoUploadDraft | null>(null);
  const draftWasCleared = useRef(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [isPersistingAsset, setIsPersistingAsset] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [categoryHasChildren, setCategoryHasChildren] = useState<Record<number, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<
    Pick<Category, "id" | "name">[]
  >([]);
  const [categoryPath, setCategoryPath] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [pressedCategoryId, setPressedCategoryId] = useState<number | null>(null);
  const categoryListOpacity = useRef(new Animated.Value(1)).current;
  const categoryListOffset = useRef(new Animated.Value(0)).current;
  const categoryTransitionDirection = useRef<1 | -1>(1);
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
    if (!user?.id || restoredDraftUserId.current === user.id) return;

    let active = true;
    restoredDraftUserId.current = user.id;
    setIsDraftReady(false);
    void loadVideoUploadDraft(user.id).then(async (draft) => {
      if (!active) return;
      if (draft) {
        let restoredCategoryPath = draft.selectedCategoryPath;
        if (
          draft.selectedCategory?.parent_id &&
          restoredCategoryPath.length <= 1
        ) {
          try {
            const response = await getCategories(draft.selectedCategory.parent_id);
            restoredCategoryPath = [
              ...response.breadcrumbs,
              {
                id: draft.selectedCategory.id,
                name: draft.selectedCategory.name,
              },
            ];
          } catch (error) {
            console.warn("[VideoUpload] Пътят на избраната категория не можа да се възстанови.", error);
          }
        }
        if (!active) return;
        setTitle(draft.title);
        setDescription(draft.description);
        setSelectedCategory(draft.selectedCategory);
        setSelectedCategoryPath(restoredCategoryPath);
        setSelected(draft.selectedVideo);
        setThumbnail(draft.thumbnail);
        setCurrentStep(
          draft.selectedVideo
            ? Math.min(Math.max(draft.currentStep, 0), UPLOAD_STEPS.length - 1)
            : 0,
        );
      }
      setIsDraftReady(true);
    });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isDraftReady || !selected || busy || draftWasCleared.current) return;

    const draft: VideoUploadDraft = {
      version: 1,
      userId: user.id,
      currentStep,
      title,
      description,
      selectedCategory,
      selectedCategoryPath,
      selectedVideo: selected,
      thumbnail,
      updatedAt: new Date().toISOString(),
    };
    latestDraft.current = draft;
    draftWasCleared.current = false;
    const timer = setTimeout(() => {
      saveVideoUploadDraft(draft);
    }, 250);

    return () => clearTimeout(timer);
  }, [busy, currentStep, description, isDraftReady, selected, selectedCategory, selectedCategoryPath, thumbnail, title, user?.id]);

  useEffect(() => {
    return () => {
      if (latestDraft.current && !draftWasCleared.current) {
        saveVideoUploadDraft(latestDraft.current);
      }
    };
  }, []);

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
    categoryListOpacity.setValue(0);
    categoryListOffset.setValue(categoryTransitionDirection.current * 44);
    Animated.parallel([
      Animated.timing(categoryListOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(categoryListOffset, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [categories, categoryListOffset, categoryListOpacity]);

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
  const selectedVideoMeta = selected
    ? [
        selected.mimeType?.replace(/^video\//, "").toUpperCase(),
        formatFileSize(selected.size),
      ]
        .filter(Boolean)
        .join(" • ")
    : null;

  async function waitForVideoReady(videoId: number) {
    if (!token || !user?.id) throw new Error("Липсва потребител за проверка на статуса на видеото.");

    const startedAtMs = Date.now();
    let previousStatus: VideoStatus | null = null;

    for (;;) {
      try {
        const profile = await getPublicProfile(token, user.id);
        const video = profile.videos?.find((item) => item.id === videoId);

        if (!video) throw new Error("Видеото вече не съществува в профила.");
        if (shouldLogVideoStatus(previousStatus, video.status)) {
          console.info("[VideoUpload] Статус на обработката.", { video_id: videoId, status: video.status });
          previousStatus = video.status;
        }
        if (video.status === "ready") return;
        if (video.status === "failed") throw new Error("Обработката на видеото не успя.");
      } catch (error) {
        if (error instanceof Error && (error.message.includes("вече не съществува") || error.message.includes("Обработката на видеото не успя"))) {
          throw error;
        }
        console.warn("[VideoUpload] Проверка на статуса не успя; ще се повтори.", error);
      }

      if (Date.now() - startedAtMs >= VIDEO_PROCESSING_MAX_WAIT_MS) {
        console.warn("[VideoUpload] Обработката надхвърли максималното време за изчакване.", { video_id: videoId });
        throw new Error(processingTimeoutMessage());
      }

      await new Promise((resolve) => setTimeout(resolve, VIDEO_PROCESSING_POLL_INTERVAL_MS));
    }
  }

  async function chooseVideo() {
    if (!isDraftReady) return;
    const result = await DocumentPicker.getDocumentAsync({ type: "video/*", copyToCacheDirectory: true });
    if (result.canceled || !user?.id) return;

    setIsPersistingAsset(true);
    try {
      setSelected(await persistDraftVideo(user.id, result.assets[0]));
    } catch (error) {
      console.error("[VideoUpload] Видеото не можа да се запази като локална чернова.", error);
      Alert.alert("Видеото не беше запазено", "Опитайте да изберете файла отново.");
    } finally {
      setIsPersistingAsset(false);
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
      const pending = user?.id ? await getPendingVideoUpload(user.id, selected.uri, fileSize) : null;
      let initialized;
      if (pending?.provider === "oneprovider") {
        try {
          initialized = await refreshVideoUploadSession(token, pending.videoId);
        } catch (error) {
          if (!(error instanceof HttpError) || error.status !== 404) throw error;
          await clearPendingVideoUpload(pending.userId);
        }
      }
      if (!initialized) {
        initialized = await beginVideoUpload(token, {
          title: title.trim() || selected.name,
          description: description.trim(),
          categoryId: selectedCategory?.id ?? null,
          filename: selected.name,
          mimeType: selected.mimeType ?? "video/mp4",
          fileSize,
        });
      }
      activeVideoId.current = initialized.data.video.id;
      if (initialized.data.upload.provider === "oneprovider" && user?.id) {
        await savePendingVideoUpload({
          userId: user.id,
          videoId: initialized.data.video.id,
          provider: "oneprovider",
          uploadId: initialized.data.upload.upload_id,
          fileUri: selected.uri,
          fileSize,
          mimeType: selected.mimeType ?? "video/mp4",
          filename: selected.name,
        });
      }
      setStage("uploading");
      updateBackgroundUpload({ stage: "uploading" });
      await uploadVideoWithTusAndRefresh(file, initialized.data.upload, (percentage) => {
        setProgress(percentage);
        updateBackgroundUpload({ progress: percentage });
      }, {
        cancelUrl: `${process.env.EXPO_PUBLIC_API_URL}/api/mobile/videos/${initialized.data.video.id}`,
        authToken: token,
      }, async () => (await refreshVideoUploadSession(token, initialized.data.video.id)).data.upload);
      setProgress(100);
      setStage("processing");
      updateBackgroundUpload({ progress: 100, stage: "processing", remainingSeconds: null });
      await completeVideoUpload(token, initialized.data.video.id);
      if (user?.id && initialized.data.upload.provider === "oneprovider") {
        await clearPendingVideoUpload(user.id);
      }
      // Dedicated processing generates and publishes its own thumbnail after
      // FFmpeg completes. The PHP thumbnail endpoint is Backblaze-only, so do
      // not let an optional local/generated thumbnail make a Dedicated upload
      // fail when staging has no B2 credentials.
      if (thumbnailUri && initialized.data.upload.provider !== "oneprovider") {
        await uploadVideoThumbnail(token, initialized.data.video.id, {
          uri: thumbnailUri,
          name: thumbnail?.fileName ?? "video-thumbnail.jpg",
          mimeType: thumbnail?.mimeType ?? "image/jpeg",
        });
      }
      await waitForVideoReady(initialized.data.video.id);
      if (user?.id) {
        draftWasCleared.current = true;
        latestDraft.current = null;
        clearVideoUploadDraft(user.id);
      }
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
    if (result.canceled || !user?.id) return;

    setIsPersistingAsset(true);
    try {
      setThumbnail(await persistDraftThumbnail(user.id, result.assets[0]));
    } catch (error) {
      console.error("[VideoUpload] Корицата не можа да се запази като локална чернова.", error);
      Alert.alert("Корицата не беше запазена", "Опитайте да изберете изображението отново.");
    } finally {
      setIsPersistingAsset(false);
    }
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
            if (user?.id) void clearPendingVideoUpload(user.id);
            if (user?.id) {
              draftWasCleared.current = true;
              latestDraft.current = null;
              clearVideoUploadDraft(user.id);
            }
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
    if (result.canceled || !user?.id) return;

    setIsPersistingAsset(true);
    try {
      setThumbnail(await persistDraftThumbnail(user.id, result.assets[0]));
    } catch (error) {
      console.error("[VideoUpload] Снимката не можа да се запази като локална чернова.", error);
      Alert.alert("Корицата не беше запазена", "Опитайте да направите снимката отново.");
    } finally {
      setIsPersistingAsset(false);
    }
  }

  function chooseThumbnail() {
    Alert.alert("Thumbnail", "Изберете източник", [
      { text: "Галерия", onPress: () => void chooseThumbnailFromLibrary() },
      { text: "Камера", onPress: () => void takeThumbnailPhoto() },
      { text: "Отказ", style: "cancel" },
    ]);
  }

  function openCategoryModal() {
    categoryTransitionDirection.current = 1;
    categoryListOpacity.setValue(1);
    categoryListOffset.setValue(0);
    setCategoryPath([]);
    setCategories(rootCategories);
    setIsCategoryModalVisible(true);
  }

  function selectCategory(category: Category) {
    setSelectedCategory(category);
    setSelectedCategoryPath([...categoryPath, category]);
    setIsCategoryModalVisible(false);
  }

  function animateCategoryListOut(direction: 1 | -1) {
    return new Promise<void>((resolve) => {
      Animated.parallel([
        Animated.timing(categoryListOpacity, {
          toValue: 0,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.timing(categoryListOffset, {
          toValue: -direction * 36,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });
  }

  async function openChildCategories(category: Category) {
    if (isCategoriesLoading) return;
    setIsCategoriesLoading(true);
    try {
      const response = await getCategories(category.id);
      if (response.items.length === 0) {
        setCategoryHasChildren((current) => ({ ...current, [category.id]: false }));
        return;
      }

      await animateCategoryListOut(1);
      categoryTransitionDirection.current = 1;
      setCategoryPath((currentPath) => [...currentPath, category]);
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

  async function goBackCategoryLevel() {
    if (categoryPath.length === 0 || isCategoriesLoading) return;
    setIsCategoriesLoading(true);
    try {
      const parentPath = categoryPath.slice(0, -1);
      const parentId = parentPath.length > 0 ? parentPath[parentPath.length - 1].id : null;
      const response = await getCategories(parentId);
      await animateCategoryListOut(-1);
      categoryTransitionDirection.current = -1;
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

  function goToStep(nextStep: number) {
    if (
      nextStep < 0 ||
      nextStep >= UPLOAD_STEPS.length ||
      nextStep === currentStep ||
      stepAnimationRunning.current ||
      !isDraftReady ||
      isPersistingAsset ||
      busy
    ) {
      return;
    }

    const direction = nextStep > currentStep ? 1 : -1;
    const travelDistance = Math.min(screenWidth * 0.82, 420);
    stepAnimationRunning.current = true;

    Animated.parallel([
      Animated.timing(stepTranslateX, {
        toValue: -direction * travelDistance,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(stepOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      stepTranslateX.setValue(direction * travelDistance);

      Animated.parallel([
        Animated.timing(stepTranslateX, {
          toValue: 0,
          duration: 270,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(stepOpacity, {
          toValue: 1,
          duration: 230,
          useNativeDriver: true,
        }),
      ]).start(() => {
        stepAnimationRunning.current = false;
      });
    });
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
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.progressHeader}>
          <View style={styles.progressTextRow}>
            <Text style={[styles.progressLabel, { color: theme.colors.primary }]}>
              Стъпка {currentStep + 1} от {UPLOAD_STEPS.length}
            </Text>
            <Text style={[styles.progressPercent, { color: theme.colors.textSecondary }]}>
              {Math.round(((currentStep + 1) / UPLOAD_STEPS.length) * 100)}%
            </Text>
          </View>
          <View style={styles.progressSegments}>
            {UPLOAD_STEPS.map((step, index) => (
              <View
                key={step.title}
                style={[
                  styles.progressSegment,
                  {
                    backgroundColor:
                      index <= currentStep
                        ? theme.colors.primary
                        : theme.colors.inputBorder,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.stepViewport}>
          <Animated.View
            style={[
              styles.stepContainer,
              {
                opacity: stepOpacity,
                transform: [{ translateX: stepTranslateX }],
              },
            ]}
          >
            <View style={styles.stepHeading}>
              <View
                style={[
                  styles.stepIcon,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Ionicons
                  name={UPLOAD_STEPS[currentStep].icon}
                  size={27}
                  color="#FFFFFF"
                />
              </View>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                {UPLOAD_STEPS[currentStep].title}
              </Text>
              <Text
                style={[styles.stepDescription, { color: theme.colors.textSecondary }]}
              >
                {currentStep === 0
                  ? "Започни с видеото, което искаш да споделиш."
                  : currentStep === 1
                    ? "Помогни на хората да разберат за какво е видеото."
                    : currentStep === 2
                      ? "Категорията помага видеото да бъде открито по-лесно."
                      : currentStep === 3
                        ? "Избери изображение или остави системата да създаде корица."
                        : "Провери всичко преди да започне качването."}
              </Text>
            </View>

            {currentStep === 0 ? (
              <Pressable
                onPress={chooseVideo}
                disabled={busy || isPersistingAsset || !isDraftReady}
                accessibilityRole="button"
                accessibilityLabel={
                  selected
                    ? `Избрано видео ${selected.name}. Смени видеото.`
                    : "Избери видео от устройството"
                }
                accessibilityHint="Отваря файловете на устройството"
                style={[
                  styles.videoPicker,
                  selected ? styles.videoPickerSelected : styles.videoPickerEmpty,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.inputBorder,
                    opacity: busy || isPersistingAsset || !isDraftReady ? 0.55 : 1,
                  },
                ]}
              >
                {isPersistingAsset ? (
                  <View style={styles.assetSavingState}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.videoPickerTitle, { color: theme.colors.text }]}>
                      Запазване на локална чернова…
                    </Text>
                    <Text
                      style={[
                        styles.videoPickerDescription,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Изчакай, докато файлът бъде подготвен.
                    </Text>
                  </View>
                ) : selected ? (
                  <>
                    <View
                      style={[
                        styles.videoSelectedIcon,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Ionicons name="videocam" size={26} color="#FFFFFF" />
                    </View>
                    <View style={styles.videoSelectedDetails}>
                      <Text
                        numberOfLines={2}
                        style={[styles.videoSelectedName, { color: theme.colors.text }]}
                      >
                        {selected.name}
                      </Text>
                      <Text
                        style={[
                          styles.videoSelectedMeta,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {selectedVideoMeta || "Видео файл"}
                      </Text>
                      <View style={styles.videoReadyRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={theme.colors.primary}
                        />
                        <Text
                          style={[
                            styles.videoReadyText,
                            { color: theme.colors.primary },
                          ]}
                        >
                          Готово за следващата стъпка
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.videoChangeButton,
                        { borderColor: theme.colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.videoChangeText,
                          { color: theme.colors.primary },
                        ]}
                      >
                        Смени
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View
                      style={[
                        styles.videoUploadIcon,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Ionicons
                        name="cloud-upload-outline"
                        size={32}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text
                      style={[styles.videoPickerTitle, { color: theme.colors.text }]}
                    >
                      Избери видео
                    </Text>
                    <Text
                      style={[
                        styles.videoPickerDescription,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Докосни тук, за да избереш файл от устройството
                    </Text>
                    <View
                      style={[
                        styles.videoFormatBadge,
                        { backgroundColor: theme.colors.background },
                      ]}
                    >
                      <Text
                        style={[
                          styles.videoFormatText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        MP4 • MOV • WEBM
                      </Text>
                    </View>
                  </>
                )}
              </Pressable>
            ) : null}

            {currentStep === 1 ? (
              <View style={styles.stepFields}>
                <AppInput
                  label="Заглавие (по желание)"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Например: Разходка из града"
                  maxLength={120}
                  editable={!busy}
                />
                <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
                  {title.length}/120
                </Text>
                <AppInput
                  label="Описание (по желание)"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Добави кратко описание"
                  maxLength={2000}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  style={styles.description}
                  editable={!busy}
                />
                <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
                  {description.length}/2000
                </Text>
              </View>
            ) : null}

            {currentStep === 2 ? (
              <View style={styles.stepFields}>
                <Pressable
                  onPress={openCategoryModal}
                  disabled={busy || isPersistingAsset || !isDraftReady}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: selectedCategory
                        ? theme.colors.primary
                        : theme.colors.inputBorder,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Избери категория за видеото"
                >
                  <View
                    style={[
                      styles.optionCardIcon,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Ionicons name="grid-outline" size={25} color="#FFFFFF" />
                  </View>
                  <View style={styles.optionCardText}>
                    <Text style={[styles.optionCardTitle, { color: theme.colors.text }]}>
                      {selectedCategory?.name ?? "Без избрана категория"}
                    </Text>
                    <Text
                      style={[
                        styles.optionCardDescription,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {selectedCategory
                        ? "Докосни, за да промениш категорията"
                        : "Докосни, за да разгледаш категориите"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
                {selectedCategory ? (
                  <Pressable
                    onPress={() => {
                      setSelectedCategory(null);
                      setSelectedCategoryPath([]);
                    }}
                    style={styles.clearOptionalButton}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.clearOptionalText, { color: theme.colors.primary }]}>
                      Премахни категорията
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {currentStep === 3 ? (
              <View style={styles.stepFields}>
                <Pressable
                  onPress={chooseThumbnail}
                  disabled={busy || isPersistingAsset || !isDraftReady}
                  style={[
                    styles.coverPicker,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: thumbnail
                        ? theme.colors.primary
                        : theme.colors.inputBorder,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    thumbnail ? "Промени корицата на видеото" : "Добави корица"
                  }
                >
                  {thumbnail ? (
                    <>
                      <Image source={{ uri: thumbnail.uri }} style={styles.coverPreview} />
                      <View style={styles.coverOverlay}>
                        <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.coverOverlayText}>Промени</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View
                        style={[
                          styles.videoUploadIcon,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Ionicons name="image-outline" size={31} color="#FFFFFF" />
                      </View>
                      <Text
                        style={[styles.videoPickerTitle, { color: theme.colors.text }]}
                      >
                        Добави корица
                      </Text>
                      <Text
                        style={[
                          styles.videoPickerDescription,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Избери изображение от галерията или направи снимка
                      </Text>
                    </>
                  )}
                </Pressable>
                <Text style={[styles.optionalHint, { color: theme.colors.textSecondary }]}>
                  Ако пропуснеш тази стъпка, корицата ще бъде създадена автоматично.
                </Text>
              </View>
            ) : null}

            {currentStep === 4 ? (
              <View style={styles.stepFields}>
                <View
                  style={[
                    styles.reviewCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.inputBorder,
                    },
                  ]}
                >
                  {[
                    {
                      label: "Видео",
                      value: selected?.name ?? "Не е избрано",
                      icon: "videocam-outline" as const,
                      step: 0,
                    },
                    {
                      label: "Заглавие",
                      value: title.trim() || "Ще се използва името на файла",
                      icon: "create-outline" as const,
                      step: 1,
                    },
                    {
                      label: "Описание",
                      value: description.trim() || "Без описание",
                      icon: "document-text-outline" as const,
                      step: 1,
                    },
                    {
                      label: "Категория",
                      value: selectedCategory?.name ?? "Без категория",
                      icon: "grid-outline" as const,
                      step: 2,
                    },
                    {
                      label: "Корица",
                      value: thumbnail?.fileName ?? "Автоматична корица",
                      icon: "image-outline" as const,
                      step: 3,
                    },
                  ].map((item, index, items) => (
                    <Pressable
                      key={item.label}
                      onPress={() => goToStep(item.step)}
                      style={[
                        styles.reviewRow,
                        index < items.length - 1
                          ? { borderBottomColor: theme.colors.inputBorder }
                          : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Редактирай ${item.label}`}
                    >
                      <Ionicons
                        name={item.icon}
                        size={21}
                        color={theme.colors.primary}
                      />
                      <View style={styles.reviewText}>
                        <Text
                          style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}
                        >
                          {item.label}
                        </Text>
                        <Text
                          numberOfLines={2}
                          style={[styles.reviewValue, { color: theme.colors.text }]}
                        >
                          {item.value}
                        </Text>
                      </View>
                      <Ionicons
                        name="pencil-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                    </Pressable>
                  ))}
                </View>
                <AppButton
                  title={busy ? "Качва се…" : "Качи видеото"}
                  loading={busy}
                  disabled={!selected || isPersistingAsset || !isDraftReady}
                  onPress={() => void upload()}
                />
              </View>
            ) : null}

            <View style={styles.stepNavigation}>
              {currentStep > 0 ? (
                <Pressable
                  onPress={() => goToStep(currentStep - 1)}
                  disabled={busy || isPersistingAsset || !isDraftReady}
                  style={[
                    styles.navigationButton,
                    styles.navigationBack,
                    { borderColor: theme.colors.inputBorder },
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons name="arrow-back" size={19} color={theme.colors.text} />
                  <Text style={[styles.navigationBackText, { color: theme.colors.text }]}>
                    Назад
                  </Text>
                </Pressable>
              ) : null}
              {currentStep < UPLOAD_STEPS.length - 1 ? (
                <Pressable
                  onPress={() => goToStep(currentStep + 1)}
                  disabled={busy || isPersistingAsset || !isDraftReady || (currentStep === 0 && !selected)}
                  style={[
                    styles.navigationButton,
                    styles.navigationNext,
                    {
                      backgroundColor: theme.colors.primary,
                      opacity:
                        busy || isPersistingAsset || !isDraftReady || (currentStep === 0 && !selected)
                          ? 0.45
                          : 1,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.navigationNextText}>Напред</Text>
                  <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        </View>
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
            <Animated.View
              style={[
                styles.categoryOptionsAnimated,
                {
                  opacity: categoryListOpacity,
                  transform: [{ translateX: categoryListOffset }],
                },
              ]}
            >
              <ScrollView
                style={styles.categoryOptionsScroll}
                contentContainerStyle={styles.categoryOptionsContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
              {categories.map((category) => {
                const hasChildren =
                  categoryHasChildren[category.id] || (category.children_count ?? 0) > 0;
                const isSelected = selectedCategory?.id === category.id;
                const isInSelectedPath = selectedCategoryPath.some(
                  (selectedPathCategory) => selectedPathCategory.id === category.id,
                );

                return (
                  <View
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      {
                        borderColor: isInSelectedPath
                          ? theme.colors.primary
                          : theme.colors.inputBorder,
                        backgroundColor:
                          pressedCategoryId === category.id
                            ? `${theme.colors.primary}24`
                            : isInSelectedPath
                              ? `${theme.colors.primary}${isSelected ? "18" : "10"}`
                              : theme.colors.card,
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() => selectCategory(category)}
                      onPressIn={() => setPressedCategoryId(category.id)}
                      onPressOut={() => setPressedCategoryId(null)}
                      disabled={isCategoriesLoading}
                      style={styles.categorySelectButton}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isInSelectedPath && !isSelected
                          ? `${category.name}, родител на избраната категория`
                          : `Избери категория ${category.name}`
                      }
                    >
                      <View style={styles.categoryOptionTextGroup}>
                        <Text
                          style={[
                            styles.categoryOptionText,
                            {
                              color: isInSelectedPath
                                ? theme.colors.primary
                                : theme.colors.text,
                            },
                          ]}
                        >
                          {category.name}
                        </Text>
                        {isInSelectedPath ? (
                          <Text
                            style={[
                              styles.categoryPathHint,
                              { color: theme.colors.primary },
                            ]}
                          >
                            {isSelected
                              ? "Избрана категория"
                              : "Съдържа избраната подкатегория"}
                          </Text>
                        ) : null}
                      </View>
                      {isInSelectedPath ? (
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "checkmark-circle-outline"}
                          size={22}
                          color={theme.colors.primary}
                        />
                      ) : null}
                    </Pressable>
                    {hasChildren ? (
                      <Pressable
                        onPress={() => void openChildCategories(category)}
                        onPressIn={() => setPressedCategoryId(category.id)}
                        onPressOut={() => setPressedCategoryId(null)}
                        disabled={isCategoriesLoading}
                        style={[
                          styles.categoryDrillButton,
                          { borderLeftColor: theme.colors.border },
                        ]}
                        hitSlop={4}
                        accessibilityRole="button"
                        accessibilityLabel={`Отвори подкатегориите на ${category.name}`}
                      >
                        <View
                          style={[
                            styles.categoryChevronCircle,
                            {
                              backgroundColor: `${theme.colors.primary}${
                                isInSelectedPath ? "24" : "16"
                              }`,
                            },
                          ]}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={32}
                            color={theme.colors.primary}
                          />
                        </View>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
              {isCategoriesLoading ? <ActivityIndicator style={styles.categoryLoader} color={theme.colors.primary} /> : null}
              {!isCategoriesLoading && categories.length === 0 ? <Text style={[styles.categoryEmpty, { color: theme.colors.textSecondary }]}>Няма налични категории.</Text> : null}
              </ScrollView>
            </Animated.View>
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
  progressHeader: { gap: 10 },
  progressTextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: { fontSize: 13, fontWeight: "800" },
  progressPercent: { fontSize: 13, fontWeight: "700" },
  progressSegments: { flexDirection: "row", gap: 6 },
  progressSegment: { flex: 1, height: 5, borderRadius: 999 },
  stepViewport: { overflow: "hidden" },
  stepContainer: { gap: 24, paddingTop: 8, paddingBottom: 8 },
  stepHeading: { alignItems: "center", paddingHorizontal: 12 },
  stepIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  stepTitle: { fontSize: 23, lineHeight: 29, fontWeight: "900", textAlign: "center" },
  stepDescription: {
    maxWidth: 340,
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  stepFields: { gap: 14 },
  characterCount: { alignSelf: "flex-end", marginTop: -8, fontSize: 12 },
  optionCard: {
    minHeight: 94,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  optionCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  optionCardText: { flex: 1, minWidth: 0 },
  optionCardTitle: { fontSize: 16, lineHeight: 21, fontWeight: "800" },
  optionCardDescription: { marginTop: 4, fontSize: 12, lineHeight: 17 },
  clearOptionalButton: { alignSelf: "center", paddingHorizontal: 14, paddingVertical: 8 },
  clearOptionalText: { fontSize: 13, fontWeight: "800" },
  coverPicker: {
    minHeight: 220,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  coverPreview: { width: "100%", height: 290, borderRadius: 15 },
  coverOverlay: {
    position: "absolute",
    right: 16,
    bottom: 16,
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  coverOverlayText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  optionalHint: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  reviewCard: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  reviewRow: {
    minHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reviewText: { flex: 1, minWidth: 0 },
  reviewLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  reviewValue: { marginTop: 3, fontSize: 14, lineHeight: 19, fontWeight: "700" },
  stepNavigation: { flexDirection: "row", gap: 10, paddingTop: 4 },
  navigationButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  navigationBack: { borderWidth: 1 },
  navigationNext: {},
  navigationBackText: { fontSize: 15, fontWeight: "800" },
  navigationNextText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  help: { fontSize: 15 },
  description: { minHeight: 100, textAlignVertical: "top" },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  fileButton: { minHeight: 58, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, justifyContent: "center", gap: 3 },
  fileButtonText: { fontSize: 16 },
  fileButtonHint: { fontSize: 12 },
  videoPicker: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 18,
  },
  assetSavingState: { minHeight: 150, alignItems: "center", justifyContent: "center" },
  videoPickerEmpty: {
    minHeight: 190,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  videoPickerSelected: {
    minHeight: 126,
    borderStyle: "solid",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  videoUploadIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  videoPickerTitle: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  videoPickerDescription: {
    maxWidth: 280,
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  videoFormatBadge: {
    marginTop: 14,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  videoFormatText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.35,
  },
  videoSelectedIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  videoSelectedDetails: {
    flex: 1,
    minWidth: 0,
  },
  videoSelectedName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  videoSelectedMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  videoReadyRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  videoReadyText: {
    fontSize: 12,
    fontWeight: "700",
  },
  videoChangeButton: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  videoChangeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  thumbnailButton: { minHeight: 120, borderWidth: 1, borderRadius: 14, padding: 10, justifyContent: "center", alignItems: "center", gap: 8 },
  thumbnailPreview: { width: "100%", aspectRatio: 9 / 16, borderRadius: 10 },
  categoryBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.48)" },
  categoryDismissArea: { ...StyleSheet.absoluteFill },
  categorySheet: { flex: 1 },
  categoryOptionsScroll: { flex: 1 },
  categoryOptionsAnimated: { flex: 1 },
  categoryOptionsContent: { paddingVertical: 16 },
  categoryHeader: { minHeight: 62, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 8 },
  categoryBackButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  categoryHeaderText: { flex: 1 },
  categoryTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  categoryBreadcrumb: { fontSize: 13, marginBottom: 8 },
  categoryOption: {
    minHeight: 78,
    width: "100%",
    justifyContent: "center",
    borderWidth: 0,
    borderBottomWidth: 1,
  },
  categorySelectButton: {
    width: "100%",
    minHeight: 78,
    paddingLeft: 24,
    paddingRight: 82,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
  },
  categoryDrillButton: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 72,
    borderLeftWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChevronCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryOptionTextGroup: { flexShrink: 1, gap: 2 },
  categoryOptionText: {
    maxWidth: "100%",
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "left",
  },
  categoryPathHint: { fontSize: 12, lineHeight: 16, fontWeight: "600" },
  categoryCheck: { fontSize: 22, fontWeight: "800" },
  categoryEmpty: { paddingVertical: 20, fontSize: 15 },
  categoryLoader: { paddingVertical: 24 },
});
