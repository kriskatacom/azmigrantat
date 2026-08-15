import { File, Paths } from "expo-file-system";
import { Asset, requestPermissionsAsync } from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

interface UseSaveChatImageParams {
  messageId: number;
  url: string;
  name: string;
  mimeType: string | null;
}

function safeFileName(messageId: number, name: string) {
  const normalized = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `chat-${messageId}-${normalized || "image.jpg"}`;
}

export function useSaveChatImage({ messageId, url, name, mimeType }: UseSaveChatImageParams) {
  const [isSaving, setIsSaving] = useState(false);

  const downloadImage = useCallback(async () => {
    const destination = new File(Paths.cache, safeFileName(messageId, name));
    if (destination.exists) return destination;
    return File.downloadFileAsync(url, destination, { idempotent: true });
  }, [messageId, name, url]);

  const saveToGallery = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const permission = await requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert("Нужно е разрешение", "Разрешете записването на снимки от настройките на телефона.");
        return;
      }
      const file = await downloadImage();
      await Asset.create(file.uri);
      Alert.alert("Снимката е запазена", "Ще я намерите в галерията и в Google Photos.");
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Снимката не можа да бъде запазена.");
    } finally {
      setIsSaving(false);
    }
  }, [downloadImage, isSaving]);

  const shareToGooglePhotos = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Споделянето не е налично", "Това устройство не поддържа системно споделяне.");
        return;
      }
      const file = await downloadImage();
      await Sharing.shareAsync(file.uri, {
        dialogTitle: "Изпрати към Google Photos",
        mimeType: mimeType ?? "image/jpeg",
        UTI: "public.image",
      });
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Снимката не можа да бъде споделена.");
    } finally {
      setIsSaving(false);
    }
  }, [downloadImage, isSaving, mimeType]);

  const openSaveMenu = useCallback(() => {
    Alert.alert("Снимка", "Какво искате да направите?", [
      { text: "Запази в галерията", onPress: () => void saveToGallery() },
      { text: "Изпрати към Google Photos…", onPress: () => void shareToGooglePhotos() },
      { text: "Отказ", style: "cancel" },
    ]);
  }, [saveToGallery, shareToGooglePhotos]);

  return { isSaving, openSaveMenu };
}
