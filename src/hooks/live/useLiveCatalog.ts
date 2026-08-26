import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import type { LiveStream } from "@/types/live";
import { normalizeLiveStream } from "@/utils/normalize-live-stream";
import { type Dispatch, type SetStateAction, useEffect } from "react";

function withOwnerFlag(stream: LiveStream, userId: number | undefined): LiveStream {
  return {
    ...stream,
    is_owner: Boolean(userId && stream.owner?.id === userId),
  };
}

export function useLiveCatalog(setLives: Dispatch<SetStateAction<LiveStream[]>>) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const onStarted = (payload: { stream?: LiveStream }) => {
      const stream = payload.stream;

      if (!stream?.id) {
        return;
      }

      const next = normalizeLiveStream(withOwnerFlag(stream, user?.id), user?.cover_image);

      setLives((current) => {
        if (current.some((item) => item.id === next.id)) {
          return current.map((item) => (item.id === next.id ? { ...item, ...next } : item));
        }

        return [next, ...current];
      });
    };

    const onEnded = (payload: { live_id: number }) => {
      if (!Number.isInteger(payload.live_id) || payload.live_id <= 0) {
        return;
      }

      setLives((current) => current.filter((item) => item.id !== payload.live_id));
    };

    const onViewerCount = (payload: { live_id: number; viewer_count: number }) => {
      if (!Number.isInteger(payload.live_id) || payload.live_id <= 0) {
        return;
      }

      const viewerCount = Math.max(0, Number(payload.viewer_count) || 0);

      setLives((current) =>
        current.map((item) =>
          item.id === payload.live_id ? { ...item, viewer_count: viewerCount } : item,
        ),
      );
    };

    socket.on("live:started", onStarted);
    socket.on("live:ended", onEnded);
    socket.on("live:viewer-count", onViewerCount);

    return () => {
      socket.off("live:started", onStarted);
      socket.off("live:ended", onEnded);
      socket.off("live:viewer-count", onViewerCount);
    };
  }, [socket, isConnected, setLives, user?.id, user?.cover_image]);
}
