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
  const [isSaveMenuVisible, setIsSaveMenuVisible] = useState(false);

  const downloadAttachment = useCallback(async () => {
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
      const file = await downloadAttachment();
      await Asset.create(file.uri);
      Alert.alert("Снимката е запазена", "Ще я намерите в галерията и в Google Photos.");
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Снимката не можа да бъде запазена.");
    } finally {
      setIsSaving(false);
    }
  }, [downloadAttachment, isSaving]);

  const downloadFile = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Споделянето не е налично", "Това устройство не поддържа системно споделяне.");
        return;
      }
      const file = await downloadAttachment();
      await Sharing.shareAsync(file.uri, {
        dialogTitle: "Свали или запази файла",
        mimeType: mimeType ?? "application/octet-stream",
      });
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Файлът не можа да бъде свален.");
    } finally {
      setIsSaving(false);
    }
  }, [downloadAttachment, isSaving, mimeType]);

  const openSaveMenu = useCallback(() => {
    if (!isSaving) setIsSaveMenuVisible(true);
  }, [isSaving]);

  const closeSaveMenu = useCallback(() => setIsSaveMenuVisible(false), []);

  return {
    isSaving,
    isSaveMenuVisible,
    openSaveMenu,
    closeSaveMenu,
    downloadFile,
    saveToGallery,
  };
}
