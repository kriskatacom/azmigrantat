import { getMockLiveMediaProvider } from "@/services/live-media/mock-live-media-provider";
import type { LiveMediaProvider } from "@/services/live-media/types";

export type { LiveMediaProvider, LiveMediaRole, LiveMediaSession, LiveMediaState } from "@/services/live-media/types";

export function getLiveMediaProvider(): LiveMediaProvider {
  return getMockLiveMediaProvider();
}
