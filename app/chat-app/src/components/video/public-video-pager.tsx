import ProfileVideoPager from "@/components/video/profile-video-pager";
import { recordVideoView } from "@/services/videos";
import type { PublicVideoItem } from "@/types/video";
import { useCallback, useMemo } from "react";

type PagerColors = {
  background: string;
  text: string;
  textSecondary: string;
};

type Props = {
  visible: boolean;
  videos: PublicVideoItem[];
  initialIndex: number;
  onClose: () => void;
  colors: PagerColors;
  token?: string | null;
  onActiveIndexChange?: (index: number) => void;
  onRequestExitFullscreen?: () => void;
  onViewVideo?: (videoId: number) => void;
  onCommentCountChange?: (videoId: number, count: number) => void;
  savedVideoIds?: ReadonlySet<number>;
  savingVideoIds?: ReadonlySet<number>;
  onToggleSaved?: (videoId: number) => void;
  onRequireAuthentication?: () => void;
};

/** Full-screen public-feed adapter using the same pager as profile videos. */
export default function PublicVideoPager({
  visible,
  videos,
  initialIndex,
  onClose,
  colors,
  token,
  onActiveIndexChange,
  onRequestExitFullscreen,
  onViewVideo,
  onCommentCountChange,
  savedVideoIds,
  savingVideoIds,
  onToggleSaved,
  onRequireAuthentication,
}: Props) {
  const playbackUrls = useMemo(() => Object.fromEntries(
    videos.flatMap((video) => video.playback_url ? [[video.id, video.playback_url]] : []),
  ), [videos]);
  const handleViewVideo = useCallback((videoId: number) => {
    onViewVideo?.(videoId);
    if (!token) return;
    void recordVideoView(token, videoId).catch((error) => {
      console.warn("[PublicVideoPager] Гледането не можа да бъде отчетено.", { videoId, error });
    });
  }, [onViewVideo, token]);

  return (
    <ProfileVideoPager
      visible={visible}
      videos={videos}
      initialIndex={initialIndex}
      playbackUrls={playbackUrls}
      onRequestPlayback={() => undefined}
      onActiveIndexChange={onActiveIndexChange}
      onRequestExitFullscreen={onRequestExitFullscreen}
      onViewVideo={handleViewVideo}
      onClose={onClose}
      colors={colors}
      token={token}
      onCommentCountChange={onCommentCountChange}
      savedVideoIds={savedVideoIds}
      savingVideoIds={savingVideoIds}
      onToggleSaved={onToggleSaved}
      onRequireAuthentication={onRequireAuthentication}
    />
  );
}
