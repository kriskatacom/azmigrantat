import type { ChatMessage } from "@/types/chat";

export interface ChatAttachment {
  url: string;
  name: string;
  mimeType: string | null;
  size: number | null;
}

function metadataString(
  metadata: Record<string, unknown> | null,
  keys: string[],
) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

export function getMessageAttachment(
  message: ChatMessage,
): ChatAttachment | null {
  if (
    message.type !== "image" &&
    message.type !== "audio" &&
    message.type !== "file" &&
    message.type !== "video"
  ) {
    return null;
  }

  const url =
    metadataString(message.metadata, ["url", "file_url", "download_url"]) ??
    (message.content?.startsWith("http") ? message.content : null);

  if (!url) {
    return null;
  }

  const fallbackName =
    message.type === "image"
      ? "Снимка"
      : message.type === "audio"
        ? "Аудио"
        : "Файл";

  return {
    url,
    name:
      metadataString(message.metadata, ["name", "original_name", "file_name"]) ??
      decodeURIComponent(url.split("/").at(-1)?.split("?")[0] || fallbackName),
    mimeType: metadataString(message.metadata, ["mime_type", "mimeType"]),
    size:
      typeof message.metadata?.size === "number" ? message.metadata.size : null,
  };
}

export function isImageAttachment(
  messageType: ChatMessage["type"],
  mimeType: string | null,
): boolean {
  return messageType === "image" || mimeType?.startsWith("image/") === true;
}

export function isAudioAttachment(
  messageType: ChatMessage["type"],
  mimeType: string | null,
): boolean {
  return messageType === "audio" || mimeType?.startsWith("audio/") === true;
}

export function formatFileSize(size: number | null): string | null {
  if (!size) {
    return null;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.ceil(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileExtension(name: string): string | null {
  const match = name.trim().match(/\.([A-Za-z0-9]{1,8})$/);
  return match ? match[1].toUpperCase() : null;
}

export function mimeTypeLabel(mimeType: string | null, messageType: ChatMessage["type"]): string {
  if (mimeType) {
    const labels: Record<string, string> = {
      "image/jpeg": "Снимка (JPEG)",
      "image/png": "Снимка (PNG)",
      "image/webp": "Снимка (WEBP)",
      "image/gif": "Снимка (GIF)",
      "audio/mp4": "Аудио",
      "audio/mpeg": "Аудио (MP3)",
      "audio/aac": "Аудио (AAC)",
      "application/pdf": "PDF документ",
      "application/zip": "ZIP архив",
      "text/plain": "Текстов файл",
    };

    if (labels[mimeType]) {
      return labels[mimeType];
    }

    if (mimeType.startsWith("image/")) {
      return "Снимка";
    }

    if (mimeType.startsWith("audio/")) {
      return "Аудио";
    }

    if (mimeType.startsWith("video/")) {
      return "Видео";
    }
  }

  if (messageType === "image") {
    return "Снимка";
  }

  if (messageType === "audio") {
    return "Аудио";
  }

  if (messageType === "video") {
    return "Видео";
  }

  return "Файл";
}
