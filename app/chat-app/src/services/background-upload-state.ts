export type BackgroundUploadStage = "preparing" | "uploading" | "processing";
export type BackgroundUploadStatus = {
  active: boolean;
  progress: number;
  stage: BackgroundUploadStage;
  elapsedSeconds: number;
  remainingSeconds: number | null;
  startedAtMs: number | null;
};
type Listener = (status: BackgroundUploadStatus) => void;

let status: BackgroundUploadStatus = {
  active: false,
  progress: 0,
  stage: "preparing",
  elapsedSeconds: 0,
  remainingSeconds: null,
  startedAtMs: null,
};
const listeners = new Set<Listener>();

export function getBackgroundUploadStatus(): BackgroundUploadStatus {
  return status;
}

export function updateBackgroundUpload(update: Partial<BackgroundUploadStatus>): void {
  status = { ...status, ...update };
  listeners.forEach((listener) => listener(status));
}

export function setBackgroundUploadActive(active: boolean): void {
  updateBackgroundUpload({ active });
}

export function subscribeToBackgroundUpload(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
