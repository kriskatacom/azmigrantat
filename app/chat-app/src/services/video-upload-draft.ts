import type * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import type * as ImagePicker from "expo-image-picker";

import type { Category } from "@/services/categories";

export type VideoUploadDraft = {
  version: 1;
  userId: number;
  currentStep: number;
  title: string;
  description: string;
  selectedCategory: Category | null;
  selectedCategoryPath: Pick<Category, "id" | "name">[];
  selectedVideo: DocumentPicker.DocumentPickerAsset | null;
  thumbnail: ImagePicker.ImagePickerAsset | null;
  updatedAt: string;
};

const draftsDirectory = new Directory(Paths.document, "video-upload-drafts");

function ensureDraftsDirectory() {
  draftsDirectory.create({ intermediates: true, idempotent: true });
}

function metadataFile(userId: number) {
  return new File(draftsDirectory, `draft-${userId}.json`);
}

function safeExtension(name: string, fallback: string) {
  const match = name.match(/\.([a-zA-Z0-9]{1,10})$/);
  return match ? `.${match[1].toLowerCase()}` : fallback;
}

async function persistAsset(
  userId: number,
  sourceUri: string,
  fileName: string,
  kind: "video" | "thumbnail",
  fallbackExtension: string,
) {
  ensureDraftsDirectory();
  const destination = new File(
    draftsDirectory,
    `${kind}-${userId}${safeExtension(fileName, fallbackExtension)}`,
  );
  await new File(sourceUri).copy(destination, { overwrite: true });
  const siblingPattern = new RegExp(`^${kind}-${userId}\\.`);
  draftsDirectory.list().forEach((entry) => {
    if (entry instanceof File && entry.uri !== destination.uri && siblingPattern.test(entry.name)) {
      entry.delete();
    }
  });
  return destination.uri;
}

export async function persistDraftVideo(
  userId: number,
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<DocumentPicker.DocumentPickerAsset> {
  const uri = await persistAsset(userId, asset.uri, asset.name, "video", ".mp4");
  return { ...asset, uri, file: undefined, base64: undefined };
}

export async function persistDraftThumbnail(
  userId: number,
  asset: ImagePicker.ImagePickerAsset,
): Promise<ImagePicker.ImagePickerAsset> {
  const fileName = asset.fileName ?? "thumbnail.jpg";
  const uri = await persistAsset(userId, asset.uri, fileName, "thumbnail", ".jpg");
  return {
    ...asset,
    uri,
    base64: undefined,
    exif: undefined,
    file: undefined,
  };
}

export function saveVideoUploadDraft(draft: VideoUploadDraft): void {
  ensureDraftsDirectory();
  const file = metadataFile(draft.userId);
  file.create({ overwrite: true, intermediates: true });
  file.write(JSON.stringify(draft));
}

export async function loadVideoUploadDraft(userId: number): Promise<VideoUploadDraft | null> {
  const file = metadataFile(userId);
  if (!file.exists) return null;

  try {
    const draft = JSON.parse(await file.text()) as VideoUploadDraft;
    if (draft.version !== 1 || draft.userId !== userId) return null;

    if (!Array.isArray(draft.selectedCategoryPath)) {
      draft.selectedCategoryPath = draft.selectedCategory ? [draft.selectedCategory] : [];
    }

    if (draft.selectedVideo && !new File(draft.selectedVideo.uri).exists) {
      draft.selectedVideo = null;
      draft.currentStep = 0;
    }
    if (draft.thumbnail && !new File(draft.thumbnail.uri).exists) {
      draft.thumbnail = null;
    }
    return draft;
  } catch (error) {
    console.warn("[VideoUploadDraft] Черновата не можа да се прочете.", error);
    return null;
  }
}

export function clearVideoUploadDraft(userId: number): void {
  ensureDraftsDirectory();
  const prefixPattern = new RegExp(`^(draft|video|thumbnail)-${userId}(\\.|$)`);
  draftsDirectory.list().forEach((entry) => {
    if (entry instanceof File && prefixPattern.test(entry.name)) {
      entry.delete();
    }
  });
}
