import type { ChatAttachmentUpload } from "@/types/chat";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useCallback } from "react";
import { Alert } from "react-native";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

interface UseChatAttachmentsParams {
  disabled: boolean;
  onSend: (attachments: ChatAttachmentUpload[]) => Promise<boolean>;
}

function validateAttachments(attachments: ChatAttachmentUpload[]) {
  const oversized = attachments.find((attachment) => (attachment.size ?? 0) > MAX_FILE_SIZE);
  if (oversized) {
    Alert.alert("Файлът е прекалено голям", `„${oversized.name}“ надвишава ограничението от 25 MB.`);
    return false;
  }
  return true;
}

export function useChatAttachments({ disabled, onSend }: UseChatAttachmentsParams) {
  const send = useCallback(async (attachments: ChatAttachmentUpload[]) => {
    if (!validateAttachments(attachments)) return;
    await onSend(attachments);
  }, [onSend]);

  const takePhoto = useCallback(async () => {
    if (disabled) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Нужен е достъп до камерата", "Разрешете достъпа до камерата от настройките на телефона.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.85 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) {
      await send([{ uri: asset.uri, name: asset.fileName ?? `photo-${Date.now()}.jpg`, mimeType: asset.mimeType ?? "image/jpeg", size: asset.fileSize }]);
    }
  }, [disabled, send]);

  const choosePhotos = useCallback(async () => {
    if (disabled) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Нужен е достъп до снимките", "Разрешете достъпа до снимките от настройките на телефона.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 5, quality: 0.85 });
    if (!result.canceled) {
      await send(result.assets.map((asset, index) => ({ uri: asset.uri, name: asset.fileName ?? `image-${Date.now()}-${index + 1}.jpg`, mimeType: asset.mimeType ?? "image/jpeg", size: asset.fileSize })));
    }
  }, [disabled, send]);

  const chooseFiles = useCallback(async () => {
    if (disabled) return;
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true, copyToCacheDirectory: true });
    if (!result.canceled) {
      await send(result.assets.map((asset) => ({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? "application/octet-stream", size: asset.size })));
    }
  }, [disabled, send]);

  return { takePhoto, choosePhotos, chooseFiles };
}
