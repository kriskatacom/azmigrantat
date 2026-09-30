import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import LiveCommentComposer from "@/components/live/live-comment-composer";
import LiveCommentTicker from "@/components/live/live-comment-ticker";
import LiveCommentsModal from "@/components/live/live-comments-modal";
import LiveActiveTalkersModal from "@/components/live/live-active-talkers-modal";
import LiveReactionsModal from "@/components/live/live-reactions-modal";
import LiveScreenRoot from "@/components/live/live-screen-root";
import LiveStage from "@/components/live/live-stage";
import AppButton from "@/components/ui/AppButton";
import RemoteImage from "@/components/ui/RemoteImage";
import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import { useLiveFullscreenBack } from "@/hooks/live/useLiveFullscreenBack";
import { useLiveMedia } from "@/hooks/live/useLiveMedia";
import { useLiveRoom } from "@/hooks/live/useLiveRoom";
import { useAuth } from "@/hooks/useAuth";
import { endLive, getLive, listLiveComments } from "@/services/live";
import { isNetworkError } from "@/services/network-guard";
import { goToLiveCatalog } from "@/utils/live-navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LiveStreamerScreen() {
  const { theme, colorScheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const liveId = Number(params.id);
  const validLiveId = Number.isInteger(liveId) && liveId > 0 ? liveId : null;
  const media = useLiveMedia();
  const room = useLiveRoom(validLiveId);
  const { keyboardVisible, keyboardOverlap } = useChatKeyboard();
  const leavingRef = useRef(false);
  const [title, setTitle] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [ending, setEnding] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [activeTalkersVisible, setActiveTalkersVisible] = useState(false);
  const [reactionsVisible, setReactionsVisible] = useState(false);
  const [fullscreen, setFullscreen] = useState(true);
  const exitFullscreen = useCallback(() => setFullscreen(false), []);
  useLiveFullscreenBack(fullscreen, exitFullscreen);

  useEffect(() => {
    if (media.connected) {
      setFullscreen(true);
    }
  }, [media.connected]);

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
        const stream = await getLive(token, validLiveId);
        if (cancelled) {
          return;
        }

        if (stream.status === "ended") {
          goToLiveCatalog(router);
          return;
        }

        if (!stream.is_owner) {
          queueMicrotask(() => {
            router.replace({
              pathname: "/live/[id]/watch",
              params: { id: String(validLiveId) },
            });
          });
          return;
        }

        setTitle(stream.title || stream.owner?.name || "Предаване на живо");
        setCoverUri(
          stream.owner?.cover_image ?? user?.cover_image ?? stream.owner?.profile_image ?? null,
        );
        room.seedViewerCount(stream.viewer_count);
        await media.startStream({
          liveId: stream.id,
          role: "streamer",
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
        }
      }
    })();

    return () => {
      cancelled = true;
      void media.stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, validLiveId]);

  useEffect(() => {
    if (!room.ended || leavingRef.current) {
      return;
    }

    leavingRef.current = true;
    Alert.alert("Предаването приключи", "Предаването беше спряно.");
    goToLiveCatalog(router);
  }, [room.ended, router]);

  const onEnd = async () => {
    if (!token || validLiveId == null || ending || leavingRef.current) {
      return;
    }

    leavingRef.current = true;
    setEnding(true);

    try {
      await endLive(token, validLiveId);
      await media.stopStream();
      goToLiveCatalog(router);
    } catch (error) {
      leavingRef.current = false;
      if (!isNetworkError(error)) {
        Alert.alert(
          "Грешка",
          error instanceof Error ? error.message : "Предаването не можа да приключи.",
        );
      }
    } finally {
      setEnding(false);
    }
  };

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
        label={media.connected ? "Предаваш на живо" : "Свързване..."}
        hint="Тук по-късно влиза LiveKit SFU, не 1:1 WebRTC."
        coverUri={coverUri}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
        onOpenComments={() => setCommentsVisible(true)}
        onOpenTalkers={() => setActiveTalkersVisible(true)}
        onOpenMoreReactions={() => setReactionsVisible(true)}
        onToggleMicrophone={() => void media.muteAudio(!media.muted)}
        onToggleCamera={() => void media.toggleCamera().then((enabled) => room.sendCameraState(enabled))}
        onSwitchCamera={() => void media.switchCamera().catch((error) => Alert.alert("Грешка", error instanceof Error ? error.message : "Камерата не може да бъде превключена."))}
        onReact={room.sendReaction}
        topInset={0}
        bottomInset={fullscreen ? overlayBottom : 16}
        localStream={media.localStream}
        remoteStream={media.remoteStream}
        remoteCameraEnabled={room.remoteCameraEnabled}
        showLocalVideo={media.cameraEnabled}
        cameraEnabled={media.cameraEnabled}
        cameraFacing={media.cameraFacing}
        microphoneEnabled={!media.muted}
        topRight={
          fullscreen ? (
            <TouchableOpacity
              style={styles.endIconButton}
              onPress={() => void onEnd()}
              disabled={ending}
              accessibilityRole="button"
              accessibilityLabel="Край на предаването"
            >
              <Ionicons
                name={ending ? "hourglass-outline" : "stop-circle-outline"}
                size={20}
                color="#ffffff"
              />
            </TouchableOpacity>
          ) : null
        }
      >
        <LiveCommentTicker comment={room.latestIncomingComment} />
      </LiveStage>
      <LiveCommentsModal
        visible={commentsVisible}
        comments={room.comments}
        onClose={() => setCommentsVisible(false)}
        onPressUser={openCommenterProfile}
        comment={comment}
        onChangeComment={setComment}
        onSendComment={sendComment}
      />
      <LiveActiveTalkersModal
        visible={activeTalkersVisible}
        talkers={room.acceptedTalkRequests}
        onClose={() => setActiveTalkersVisible(false)}
        onRemove={(requestId) => room.cancelTalkRequest(requestId)}
        onPressUser={openCommenterProfile}
      />
      <LiveReactionsModal
        visible={reactionsVisible}
        onClose={() => setReactionsVisible(false)}
        onReact={room.sendReaction}
        comment={comment}
        onChangeComment={setComment}
        onSendComment={sendComment}
      />
      {room.incomingTalkRequests.length > 0 ? (
        <View style={styles.talkRequestsPanel}>
          <View style={styles.talkRequestsHeader}>
            <Ionicons name="mic-outline" size={18} color="#ffffff" />
            <Text style={styles.talkRequestsTitle}>
              Заявки за разговор ({room.incomingTalkRequests.length})
            </Text>
          </View>
          <ScrollView
            style={styles.talkRequestsScroll}
            contentContainerStyle={styles.talkRequestsContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {room.incomingTalkRequests.map((request) => (
              <View key={request.request_id} style={styles.talkRequestCard}>
                <Pressable
                  style={styles.talkRequestUser}
                  onPress={() => openCommenterProfile(request.viewer.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Профил на ${request.viewer.name}`}
                >
                  {request.viewer.profile_image ? (
                    <RemoteImage uri={request.viewer.profile_image} style={styles.talkRequestAvatar} />
                  ) : (
                    <View style={styles.talkRequestAvatarFallback}>
                      <Ionicons name="person" size={20} color="#ffffff" />
                    </View>
                  )}
                  <View style={styles.talkRequestUserText}>
                    <Text style={styles.talkRequestName} numberOfLines={1}>{request.viewer.name}</Text>
                    <Text style={styles.talkRequestSubtitle}>Иска да говори с теб</Text>
                  </View>
                </Pressable>
                <View style={styles.talkRequestActions}>
                  <TouchableOpacity
                    style={styles.talkAcceptButton}
                    onPress={() => room.acceptTalkRequest(request.request_id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Приеми заявката от ${request.viewer.name}`}
                  >
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.talkRejectButton}
                    onPress={() => room.rejectTalkRequest(request.request_id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Откажи заявката от ${request.viewer.name}`}
                  >
                    <Ionicons name="close" size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
      {fullscreen || keyboardVisible ? null : (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.control}
            onPress={() => void media.muteAudio(!media.muted)}
          >
            <Text style={[styles.controlText, { color: theme.colors.text }]}>
              {media.muted ? "Unmute" : "Mute"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.control} onPress={() => void media.toggleCamera()}>
            <Text style={[styles.controlText, { color: theme.colors.text }]}>
              {media.cameraEnabled ? "Camera off" : "Camera on"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {reactionsVisible ? null : fullscreen ? (
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
      ) : (
        <View style={[styles.bottomBar, composerBarStyle]}>
          <LiveCommentComposer
            value={comment}
            placeholder="Напиши коментар"
            onChangeText={setComment}
            onSend={sendComment}
            keyboardVisible={keyboardVisible}
            compact
            showSendButton={keyboardVisible}
            colors={theme.colors}
          />
          {keyboardVisible ? null : (
            <View style={styles.footer}>
              <AppButton title="Приключи предаването" loading={ending} onPress={() => void onEnd()} />
            </View>
          )}
        </View>
      )}
    </LiveScreenRoot>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 10 },
  control: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  controlText: { fontWeight: "700" },
  bottomBar: { width: "100%" },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  fullscreenComposer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  endIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  talkRequestsPanel: {
    position: "absolute",
    top: 118,
    left: 16,
    right: 16,
    zIndex: 30,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "rgba(8, 12, 24, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  talkRequestsHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 8 },
  talkRequestsTitle: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
  talkRequestsScroll: { maxHeight: 300 },
  talkRequestsContent: { gap: 8 },
  talkRequestCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)" },
  talkRequestUser: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  talkRequestAvatar: { width: 42, height: 42, borderRadius: 21 },
  talkRequestAvatarFallback: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#475569" },
  talkRequestUserText: { flex: 1, minWidth: 0 },
  talkRequestName: { color: "#ffffff", fontWeight: "800", fontSize: 14 },
  talkRequestSubtitle: { color: "#cbd5e1", fontSize: 12, marginTop: 2 },
  talkRequestActions: { flexDirection: "row", gap: 8 },
  talkAcceptButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#16a34a" },
  talkRejectButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#dc2626" },
});
