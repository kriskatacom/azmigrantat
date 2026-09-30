import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import LiveCommentComposer from "@/components/live/live-comment-composer";
import LiveCommentList from "@/components/live/live-comment-list";
import LiveScreenRoot from "@/components/live/live-screen-root";
import LiveStage from "@/components/live/live-stage";
import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import { useLiveFullscreenBack } from "@/hooks/live/useLiveFullscreenBack";
import { useLiveMedia } from "@/hooks/live/useLiveMedia";
import { useLiveRoom } from "@/hooks/live/useLiveRoom";
import { useAuth } from "@/hooks/useAuth";
import { joinLive, leaveLive, listLiveComments } from "@/services/live";
import { isNetworkError } from "@/services/network-guard";
import { goToLiveCatalog } from "@/utils/live-navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LiveViewerScreen() {
  const { theme, colorScheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const liveId = Number(params.id);
  const validLiveId = Number.isInteger(liveId) && liveId > 0 ? liveId : null;
  const media = useLiveMedia();
  const room = useLiveRoom(validLiveId);
  const { keyboardVisible } = useChatKeyboard();
  const leavingRef = useRef(false);
  const [title, setTitle] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [talkingStopped, setTalkingStopped] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const exitFullscreen = useCallback(() => setFullscreen(false), []);
  useLiveFullscreenBack(fullscreen, exitFullscreen);
  const overlayBottom = 16;
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

        setTitle(stream.title || stream.owner?.name || "Предаване на живо");
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
      fullscreen={fullscreen}
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <StatusBar
        hidden={fullscreen}
        style={colorScheme === "dark" || fullscreen ? "light" : "dark"}
      />
      {fullscreen ? null : <Header title={title || "Предаване на живо"} hideSearchButton />}
      <LiveStage
        connected={media.connected}
        error={media.error}
        viewerCount={room.viewerCount}
        reactions={room.reactions}
        fullscreen={fullscreen}
        keyboardVisible={keyboardVisible}
        label={media.connected ? "Гледаш предаване на живо" : "Присъединяване..."}
        hint="Медията ще идва от SFU, не от peer-to-peer call."
        coverUri={coverUri}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
        onReact={room.sendReaction}
        topInset={0}
        bottomInset={fullscreen ? overlayBottom : 16}
        remoteStream={media.remoteStream}
      >
        {fullscreen ? (
          <View style={[styles.fullscreenComments, { bottom: overlayBottom }]}>
            <LiveCommentList
              comments={room.comments}
              onPressUser={openCommenterProfile}
              keyboardVisible={keyboardVisible}
            />
          </View>
        ) : null}
      </LiveStage>
      {room.talkRequest?.status === "accepted" && media.talking ? (
        <TouchableOpacity
          style={styles.talkButtonActive}
          onPress={() => {
            setTalkingStopped(true);
            room.cancelTalkRequest(room.talkRequest?.request_id);
            void media.stopTalking();
          }}
        >
          <Text style={styles.talkButtonText}>Спри да говориш</Text>
        </TouchableOpacity>
      ) : room.talkRequest?.status === "pending" ? (
        <TouchableOpacity style={styles.talkButtonPending} onPress={() => room.cancelTalkRequest(room.talkRequest?.request_id)}>
          <Text style={styles.talkButtonText}>Изчакваш одобрение</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.talkButton} onPress={room.requestToSpeak}>
          <Text style={styles.talkButtonText}>Поискай да говориш</Text>
        </TouchableOpacity>
      )}
      {fullscreen ? null : (
        <LiveCommentList
          comments={room.comments}
          onPressUser={openCommenterProfile}
          keyboardVisible={keyboardVisible}
        />
      )}
      <View style={[fullscreen ? styles.fullscreenComposer : null, composerBarStyle]}>
        <LiveCommentComposer
          value={comment}
          placeholder="Напиши коментар"
          onChangeText={setComment}
          onSend={sendComment}
          keyboardVisible={keyboardVisible}
          compact={fullscreen || !keyboardVisible}
          colors={theme.colors}
        />
      </View>
    </LiveScreenRoot>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fullscreenComments: {
    position: "absolute",
    left: 0,
    right: 70,
    height: 180,
  },
  fullscreenComposer: {
    width: "100%",
  },
  talkButton: { marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: "#2563eb", alignItems: "center" },
  talkButtonPending: { marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: "#64748b", alignItems: "center" },
  talkButtonActive: { marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: "#dc2626", alignItems: "center" },
  talkButtonText: { color: "#fff", fontWeight: "800" },
});
