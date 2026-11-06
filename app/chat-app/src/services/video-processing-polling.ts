import type { VideoStatus } from "@/types/video";

export const VIDEO_PROCESSING_POLL_INTERVAL_MS = 3000;
export const VIDEO_PROCESSING_MAX_WAIT_MS = 5 * 60 * 1000;

export function shouldLogVideoStatus(previous: VideoStatus | null, current: VideoStatus): boolean {
  return previous !== current;
}

export function processingTimeoutMessage(): string {
  return "Обработката на видеото отнема прекалено дълго. Проверете по-късно в профила си.";
}
