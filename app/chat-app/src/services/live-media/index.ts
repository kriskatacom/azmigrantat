import { getMediasoupLiveMediaProvider } from "@/services/live-media/mediasoup-live-media-provider";
import { getMockLiveMediaProvider } from "@/services/live-media/mock-live-media-provider";
import type { LiveMediaProvider } from "@/services/live-media/types";

export type { LiveMediaProvider, LiveMediaRole, LiveMediaSession, LiveMediaState } from "@/services/live-media/types";

export function getLiveMediaProvider(): LiveMediaProvider {
  return process.env.EXPO_PUBLIC_LIVE_MEDIA_PROVIDER === "mock"
    ? getMockLiveMediaProvider()
    : getMediasoupLiveMediaProvider();
}
