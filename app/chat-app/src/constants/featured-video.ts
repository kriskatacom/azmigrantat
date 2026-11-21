import type { VideoItem } from "@/types/video";

/** Stable database ID of the video that always opens the home feed. */
export const FEATURED_HOME_VIDEO_ID = 82;

export function getVideoDisplayTitle(
  video: Pick<VideoItem, "id" | "title">,
): string {
  return video.id === FEATURED_HOME_VIDEO_ID ? "" : video.title;
}

export function shouldHideVideoUploader(videoId: number): boolean {
  return videoId === FEATURED_HOME_VIDEO_ID;
}

export function shouldHideVideoSocialActions(videoId: number): boolean {
  return videoId === FEATURED_HOME_VIDEO_ID;
}
