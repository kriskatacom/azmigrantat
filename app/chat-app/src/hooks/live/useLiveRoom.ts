import { useSocket } from "@/hooks/useSocket";
import type {
  LiveTalkRequestReceivedPayload,
  LiveTalkRequestUpdatedPayload,
} from "@/services/socket";
import type { LiveComment, LiveReactionType } from "@/types/live";
import { useCallback, useEffect, useState } from "react";

export type LiveReactionEvent = {
  id: string;
  live_id: number;
  type: LiveReactionType;
  user: { id: number; name: string };
  at: number;
};

function reactionId(payload: { live_id: number; type: string; user: { id: number } }): string {
  return `${payload.live_id}-${payload.user.id}-${payload.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useLiveRoom(liveId: number | null) {
  const { socket, isConnected } = useSocket();
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [reactions, setReactions] = useState<LiveReactionEvent[]>([]);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [talkRequest, setTalkRequest] = useState<LiveTalkRequestUpdatedPayload | null>(null);
  const [incomingTalkRequests, setIncomingTalkRequests] = useState<LiveTalkRequestReceivedPayload[]>([]);

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
        [...current, { ...payload, id: reactionId(payload), at: Date.now() }]
          .filter((item) => Date.now() - item.at < 6_000)
          .slice(-24),
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

    const onTalkRequestReceived = (payload: LiveTalkRequestReceivedPayload) => {
      if (payload.live_id !== liveId) return;
      setIncomingTalkRequests((current) => [
        ...current.filter((item) => item.request_id !== payload.request_id),
        payload,
      ]);
    };

    const onTalkRequestUpdated = (payload: LiveTalkRequestUpdatedPayload) => {
      if (payload.live_id !== liveId) return;
      setTalkRequest(payload);
      setIncomingTalkRequests((current) =>
        payload.status === "pending"
          ? current
          : current.filter((item) => item.request_id !== payload.request_id),
      );
    };

    socket.on("live:viewer-count", onCount);
    socket.on("live:comment", onComment);
    socket.on("live:reaction", onReaction);
    socket.on("live:ended", onEnded);
    socket.on("live:error", onError);
    socket.on("live:talk-request:received", onTalkRequestReceived);
    socket.on("live:talk-request:updated", onTalkRequestUpdated);

    return () => {
      socket.emit("live:leave", { live_id: liveId });
      socket.off("live:viewer-count", onCount);
      socket.off("live:comment", onComment);
      socket.off("live:reaction", onReaction);
      socket.off("live:ended", onEnded);
      socket.off("live:error", onError);
      socket.off("live:talk-request:received", onTalkRequestReceived);
      socket.off("live:talk-request:updated", onTalkRequestUpdated);
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

  const requestToSpeak = useCallback(() => {
    if (socket && liveId != null) socket.emit("live:talk-request", { live_id: liveId });
  }, [socket, liveId]);

  const acceptTalkRequest = useCallback((requestId: string) => {
    if (socket && liveId != null) socket.emit("live:talk-request:accept", { live_id: liveId, request_id: requestId });
  }, [socket, liveId]);

  const rejectTalkRequest = useCallback((requestId: string) => {
    if (socket && liveId != null) socket.emit("live:talk-request:reject", { live_id: liveId, request_id: requestId });
  }, [socket, liveId]);

  const cancelTalkRequest = useCallback((requestId?: string) => {
    if (socket && liveId != null) socket.emit("live:talk-request:cancel", { live_id: liveId, request_id: requestId });
  }, [socket, liveId]);

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
    requestToSpeak,
    acceptTalkRequest,
    rejectTalkRequest,
    cancelTalkRequest,
    talkRequest,
    incomingTalkRequests,
    seedComments,
    seedViewerCount,
  };
}
