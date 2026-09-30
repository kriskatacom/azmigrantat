import { useAppTheme } from "@/app/_layout";
import LiveCommentComposer from "@/components/live/live-comment-composer";
import LiveCommentTicker from "@/components/live/live-comment-ticker";
import LiveCommentsModal from "@/components/live/live-comments-modal";
import LiveReactionsModal from "@/components/live/live-reactions-modal";
import LiveScreenRoot from "@/components/live/live-screen-root";
import LiveStage from "@/components/live/live-stage";
import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import { useLiveMedia } from "@/hooks/live/useLiveMedia";
import { useLiveRoom } from "@/hooks/live/useLiveRoom";
import { useAuth } from "@/hooks/useAuth";
import { joinLive, leaveLive, listLiveComments } from "@/services/live";
import { isNetworkError } from "@/services/network-guard";
import { goToLiveCatalog } from "@/utils/live-navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LiveViewerScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const liveId = Number(params.id);
  const validLiveId = Number.isInteger(liveId) && liveId > 0 ? liveId : null;
  const media = useLiveMedia();
  const room = useLiveRoom(validLiveId);
  const { keyboardVisible, keyboardOverlap } = useChatKeyboard();
  const leavingRef = useRef(false);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [talkingStopped, setTalkingStopped] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [reactionsVisible, setReactionsVisible] = useState(false);
  const composerBarStyle = {
    backgroundColor: theme.colors.card,
    paddingBottom: keyboardVisible ? 0 : insets.bottom,
  };

  const openCommenterProfile = useCallback(
    (userId: number) => {
      router.push({ pathname: "/user/[id]", params: { id: String(userId) } });
    },
    [router],
  );

  useEffect(() => {
    if (!token || validLiveId == null) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const stream = await joinLive(token, validLiveId);
        if (cancelled) {
          return;
        }

        if (stream.status === "ended") {
          goToLiveCatalog(router);
          return;
        }

        if (stream.is_owner) {
          queueMicrotask(() => {
            router.replace({
              pathname: "/live/[id]/stream",
              params: { id: String(validLiveId) },
            });
          });
          return;
        }

        setCoverUri(stream.owner?.cover_image ?? stream.owner?.profile_image ?? null);
        room.seedViewerCount(stream.viewer_count);
        await media.joinStream({
          liveId: stream.id,
          role: "viewer",
          provider: stream.media_provider,
          mediaRoomId: stream.media_room_id,
          mediaNodeId: stream.media_session?.media_node_id,
        sessionId: stream.media_session?.session_id,
        participantId: typeof stream.media_session?.participant_id === "number"
          ? stream.media_session.participant_id
          : null,
          signalingEndpoint: stream.media_session?.signaling_endpoint,
          signalingUrl: stream.media_session?.signaling_url,
          rtcHost: stream.media_session?.rtc_host,
          routerId: stream.media_session?.router_id,
          routerRtpCapabilities: stream.media_session?.router_rtp_capabilities,
        });
        const comments = await listLiveComments(token, stream.id, { limit: 30 });
        if (!cancelled) {
          room.seedComments([...comments.data].reverse());
        }
      } catch (error) {
        if (!cancelled && !isNetworkError(error)) {
          Alert.alert("Грешка", error instanceof Error ? error.message : "Предаването не можа да се отвори.");
          goToLiveCatalog(router);
        }
      }
    })();

    return () => {
      cancelled = true;
      void media.leaveStream();
      if (token && validLiveId != null) {
        void leaveLive(token, validLiveId).catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, validLiveId]);

  useEffect(() => {
    const request = room.talkRequest;
    const mediaSession = request?.media_session;
    if (request?.status === "accepted" && mediaSession && !media.talking && !talkingStopped) {
      void media.startTalking({
        liveId: validLiveId ?? 0,
        role: "speaker",
        provider: String(mediaSession.media_provider ?? "mediasoup"),
        mediaRoomId: typeof mediaSession.media_room_id === "string" ? mediaSession.media_room_id : null,
        mediaNodeId: typeof mediaSession.media_node_id === "string" ? mediaSession.media_node_id : undefined,
        sessionId: typeof mediaSession.session_id === "string" ? mediaSession.session_id : undefined,
        participantId: typeof mediaSession.participant_id === "number"
          ? mediaSession.participant_id
          : null,
        signalingEndpoint: typeof mediaSession.signaling_endpoint === "string" ? mediaSession.signaling_endpoint : undefined,
        signalingUrl: typeof mediaSession.signaling_url === "string" ? mediaSession.signaling_url : undefined,
        rtcHost: typeof mediaSession.rtc_host === "string" ? mediaSession.rtc_host : undefined,
        routerId: typeof mediaSession.router_id === "string" ? mediaSession.router_id : null,
        routerRtpCapabilities: mediaSession.router_rtp_capabilities,
      }).catch((error) => Alert.alert("Грешка", error instanceof Error ? error.message : "Микрофонът не можа да се включи."));
    }

    if (request?.status !== "accepted" && talkingStopped) {
      setTalkingStopped(false);
    }

    if ((request?.status === "rejected" || request?.status === "cancelled" || request?.status === "expired") && media.talking) {
      void media.stopTalking();
    }
  }, [media, room.talkRequest, talkingStopped, validLiveId]);

  useEffect(() => {
    if (!room.ended || leavingRef.current) {
      return;
    }

    leavingRef.current = true;
    Alert.alert("Предаването приключи", "Стриймърът спря предаването.");
    goToLiveCatalog(router);
  }, [room.ended, router]);

  const sendComment = () => {
    const body = comment.trim();
    if (!body) {
      return;
    }
    room.sendComment(body);
    setComment("");
  };

  return (
    <LiveScreenRoot
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <StatusBar
        hidden
        style="light"
      />
      <LiveStage
        connected={media.connected}
        error={media.error}
        viewerCount={room.viewerCount}
        reactions={room.reactions}
        label={media.connected ? "Гледаш предаване на живо" : "Присъединяване..."}
        coverUri={coverUri}
        onOpenComments={() => setCommentsVisible(true)}
        onOpenMoreReactions={() => setReactionsVisible(true)}
        topRight={
          room.talkRequest?.status === "accepted" && media.talking ? (
            <TouchableOpacity
              style={[styles.talkIconButton, styles.talkIconButtonActive]}
              onPress={() => {
                setTalkingStopped(true);
                room.cancelTalkRequest(room.talkRequest?.request_id);
                void media.stopTalking();
              }}
              accessibilityRole="button"
              accessibilityLabel="Спри разговора"
            >
              <Ionicons name="mic" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : room.talkRequest?.status === "pending" ? (
            <TouchableOpacity
              style={[styles.talkIconButton, styles.talkIconButtonPending]}
              onPress={() => room.cancelTalkRequest(room.talkRequest?.request_id)}
              accessibilityRole="button"
              accessibilityLabel="Отмени заявката за разговор"
            >
              <Ionicons name="time-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.talkIconButton}
              onPress={room.requestToSpeak}
              accessibilityRole="button"
              accessibilityLabel="Поискай да говориш с предаващия"
            >
              <Ionicons name="mic-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          )
        }
        onReact={room.sendReaction}
        bottomInset={16}
        remoteStream={media.remoteStream}
        remoteCameraEnabled={room.remoteCameraEnabled}
      />
      <LiveCommentTicker
        comment={room.latestIncomingComment}
        bottomOffset={keyboardVisible ? keyboardOverlap + 78 : insets.bottom + 108}
      />
      <LiveCommentsModal
        visible={commentsVisible}
        comments={room.comments}
        onClose={() => setCommentsVisible(false)}
        onPressUser={openCommenterProfile}
        comment={comment}
        onChangeComment={setComment}
        onSendComment={sendComment}
      />
      <LiveReactionsModal
        visible={reactionsVisible}
        onClose={() => setReactionsVisible(false)}
        onReact={room.sendReaction}
        comment={comment}
        onChangeComment={setComment}
        onSendComment={sendComment}
      />
      {reactionsVisible ? null : (
        <View
          style={[
            styles.fullscreenComposer,
            composerBarStyle,
            {
              bottom: keyboardVisible ? keyboardOverlap + 8 : 0,
              paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom + 16, 24),
              backgroundColor: "transparent",
            },
          ]}
        >
          <LiveCommentComposer
            value={comment}
            placeholder="Напиши коментар"
            onChangeText={setComment}
            onSend={sendComment}
            keyboardVisible={keyboardVisible}
            compact
            transparentBackground
            showSendButton={keyboardVisible}
            colors={theme.colors}
          />
        </View>
      )}
    </LiveScreenRoot>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  talkIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 12, 24, 0.78)",
  },
  talkIconButtonPending: { backgroundColor: "rgba(234, 179, 8, 0.88)" },
  talkIconButtonActive: { backgroundColor: "rgba(22, 163, 74, 0.9)" },
  fullscreenComposer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    paddingHorizontal: 16,
    zIndex: 10,
  },
});
