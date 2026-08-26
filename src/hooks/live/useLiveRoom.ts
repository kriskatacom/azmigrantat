import { useSocket } from "@/hooks/useSocket";
import type { LiveComment, LiveReactionType } from "@/types/live";
import { useCallback, useEffect, useState } from "react";

type LiveReactionEvent = {
  live_id: number;
  type: LiveReactionType;
  user: { id: number; name: string };
  at: number;
};

export function useLiveRoom(liveId: number | null) {
  const { socket, isConnected } = useSocket();
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [reactions, setReactions] = useState<LiveReactionEvent[]>([]);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !isConnected || liveId == null) {
      return;
    }

    socket.emit("live:join", { live_id: liveId });

    const onCount = (payload: { live_id: number; viewer_count: number }) => {
      if (payload.live_id === liveId) {
        setViewerCount(payload.viewer_count);
      }
    };

    const onComment = (payload: LiveComment) => {
      if (payload.live_id !== liveId) {
        return;
      }

      setComments((current) => {
        if (current.some((item) => item.id === payload.id)) {
          return current;
        }

        return [...current, payload].slice(-100);
      });
    };

    const onReaction = (payload: {
      live_id: number;
      type: LiveReactionType;
      user: { id: number; name: string };
    }) => {
      if (payload.live_id !== liveId) {
        return;
      }

      setReactions((current) =>
        [...current, { ...payload, at: Date.now() }].slice(-20),
      );
    };

    const onEnded = (payload: { live_id: number }) => {
      if (payload.live_id === liveId) {
        setEnded(true);
      }
    };

    const onError = (payload: { live_id: number | null; message: string }) => {
      if (payload.live_id === liveId || payload.live_id === null) {
        setError(payload.message);
      }
    };

    socket.on("live:viewer-count", onCount);
    socket.on("live:comment", onComment);
    socket.on("live:reaction", onReaction);
    socket.on("live:ended", onEnded);
    socket.on("live:error", onError);

    return () => {
      socket.emit("live:leave", { live_id: liveId });
      socket.off("live:viewer-count", onCount);
      socket.off("live:comment", onComment);
      socket.off("live:reaction", onReaction);
      socket.off("live:ended", onEnded);
      socket.off("live:error", onError);
    };
  }, [socket, isConnected, liveId]);

  const sendComment = useCallback(
    (body: string) => {
      if (!socket || liveId == null) {
        return;
      }

      socket.emit("live:comment", { live_id: liveId, body });
    },
    [socket, liveId],
  );

  const sendReaction = useCallback(
    (type: LiveReactionType) => {
      if (!socket || liveId == null) {
        return;
      }

      socket.emit("live:reaction", { live_id: liveId, type });
    },
    [socket, liveId],
  );

  const seedComments = useCallback((items: LiveComment[]) => {
    setComments(items);
  }, []);

  const seedViewerCount = useCallback((count: number) => {
    setViewerCount(count);
  }, []);

  return {
    viewerCount,
    comments,
    reactions,
    ended,
    error,
    sendComment,
    sendReaction,
    seedComments,
    seedViewerCount,
  };
}
