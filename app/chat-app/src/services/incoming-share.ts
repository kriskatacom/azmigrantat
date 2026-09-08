import type { ChatAttachmentUpload } from "@/types/chat";
import type { ResolvedSharePayload } from "expo-sharing";

export const MAX_SHARED_FILE_SIZE = 25 * 1024 * 1024;

export function fileNameFromUri(uri: string): string {
  try {
    const path = decodeURIComponent(uri.split("?")[0] ?? uri);
    const name = path.split("/").pop();
    if (name) {
      return name;
    }
  } catch {
    // Fall through to a generated name.
  }

  return `file-${Date.now()}`;
}

export function getSharedTextItems(payloads: ResolvedSharePayload[]): string[] {
  const texts: string[] = [];

  for (const payload of payloads) {
    if (payload.shareType === "text" || payload.contentType === "text") {
      const value = payload.value.trim();
      if (value) {
        texts.push(value);
      }
      continue;
    }

    if (payload.shareType === "url" || payload.contentType === "website") {
      const value = (payload.value || payload.contentUri || "").trim();
      if (value) {
        texts.push(value);
      }
    }
  }

  return texts;
}

export function getSharedAttachments(
  payloads: ResolvedSharePayload[],
): ChatAttachmentUpload[] {
  const attachments: ChatAttachmentUpload[] = [];

  for (const payload of payloads) {
    if (
      payload.shareType === "text" ||
      payload.shareType === "url" ||
      payload.contentType === "text" ||
      payload.contentType === "website"
    ) {
      continue;
    }

    const uri = payload.contentUri ?? payload.value;
    if (!uri) {
      continue;
    }

    attachments.push({
      uri,
      name: payload.originalName?.trim() || fileNameFromUri(uri),
      mimeType:
        payload.contentMimeType ||
        payload.mimeType ||
        "application/octet-stream",
      size: payload.contentSize,
    });
  }

  return attachments;
}

export function findOversizedAttachment(
  attachments: ChatAttachmentUpload[],
): ChatAttachmentUpload | undefined {
  return attachments.find(
    (attachment) => (attachment.size ?? 0) > MAX_SHARED_FILE_SIZE,
  );
}
