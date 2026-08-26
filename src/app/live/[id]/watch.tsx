import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import LiveCommentComposer from "@/components/live/live-comment-composer";
import LiveCommentList from "@/components/live/live-comment-list";
import LiveReactions from "@/components/live/live-reactions";
import LiveViewerCount from "@/components/live/live-viewer-count";
import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import { useLiveMedia } from "@/hooks/live/useLiveMedia";
import { useLiveRoom } from "@/hooks/live/useLiveRoom";
import { useAuth } from "@/hooks/useAuth";
import { joinLive, leaveLive, listLiveComments } from "@/services/live";
import { isNetworkError } from "@/services/network-guard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

export default function LiveViewerScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const liveId = Number(params.id);
  const validLiveId = Number.isInteger(liveId) && liveId > 0 ? liveId : null;
  const media = useLiveMedia();
  const room = useLiveRoom(validLiveId);
  const { keyboardVisible } = useChatKeyboard();
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

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

        if (stream.is_owner) {
          router.replace({
            pathname: "/live/[id]/stream",
            params: { id: String(validLiveId) },
          });
          return;
        }

        setTitle(stream.title || stream.owner?.name || "Live");
        room.seedViewerCount(stream.viewer_count);
        await media.joinStream({
          liveId: stream.id,
          role: "viewer",
          provider: stream.media_provider,
          mediaRoomId: stream.media_room_id,
        });
        const comments = await listLiveComments(token, stream.id, { limit: 30 });
        if (!cancelled) {
          room.seedComments([...comments.data].reverse());
        }
      } catch (error) {
        if (!cancelled && !isNetworkError(error)) {
          Alert.alert("Грешка", error instanceof Error ? error.message : "Live не можа да се отвори.");
          router.replace("/live");
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
    if (room.ended) {
      Alert.alert("Live приключи", "Стриймърът спря предаването.");
      router.replace("/live");
    }
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <Header title={title || "Live"} hideSearchButton />
      <View
        style={[
          styles.stage,
          { backgroundColor: "#0b1220", height: keyboardVisible ? 120 : 200 },
        ]}
      >
        <Text style={styles.stageLabel}>
          {media.connected ? "Гледаш live (mock media)" : "Присъединяване..."}
        </Text>
        <Text style={styles.stageHint}>Медията ще идва от SFU, не от peer-to-peer call.</Text>
        <View style={styles.stageMeta}>
          <LiveViewerCount count={room.viewerCount} />
        </View>
      </View>
      <LiveCommentList comments={room.comments} />
      {room.reactions.length > 0 && !keyboardVisible ? (
        <Text style={[styles.reactionFlash, { color: theme.colors.textSecondary }]}>
          {room.reactions[room.reactions.length - 1]?.user.name}:{" "}
          {room.reactions[room.reactions.length - 1]?.type}
        </Text>
      ) : null}
      <LiveCommentComposer
        value={comment}
        placeholder="Напиши коментар"
        onChangeText={setComment}
        onSend={sendComment}
        keyboardVisible={keyboardVisible}
        colors={theme.colors}
      />
      {!keyboardVisible ? (
        <View style={styles.footer}>
          <LiveReactions onReact={room.sendReaction} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stage: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  stageLabel: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  stageHint: { color: "#94a3b8", marginTop: 8, textAlign: "center" },
  stageMeta: { position: "absolute", top: 12, right: 12 },
  reactionFlash: { paddingHorizontal: 16, marginBottom: 8 },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
});
