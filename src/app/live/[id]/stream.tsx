import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import LiveCommentComposer from "@/components/live/live-comment-composer";
import LiveCommentList from "@/components/live/live-comment-list";
import LiveReactions from "@/components/live/live-reactions";
import LiveViewerCount from "@/components/live/live-viewer-count";
import AppButton from "@/components/ui/AppButton";
import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import { useLiveMedia } from "@/hooks/live/useLiveMedia";
import { useLiveRoom } from "@/hooks/live/useLiveRoom";
import { useAuth } from "@/hooks/useAuth";
import { endLive, getLive, listLiveComments } from "@/services/live";
import { isNetworkError } from "@/services/network-guard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LiveStreamerScreen() {
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
  const [ending, setEnding] = useState(false);

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

        if (!stream.is_owner) {
          router.replace({
            pathname: "/live/[id]/watch",
            params: { id: String(validLiveId) },
          });
          return;
        }

        setTitle(stream.title || stream.owner?.name || "Live");
        room.seedViewerCount(stream.viewer_count);
        await media.startStream({
          liveId: stream.id,
          role: "streamer",
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
    if (room.ended) {
      Alert.alert("Live приключи", "Предаването беше спряно.");
      router.replace("/live");
    }
  }, [room.ended, router]);

  const onEnd = async () => {
    if (!token || validLiveId == null || ending) {
      return;
    }

    setEnding(true);

    try {
      await endLive(token, validLiveId);
      await media.stopStream();
      router.replace("/live");
    } catch (error) {
      if (!isNetworkError(error)) {
        Alert.alert(
          "Грешка",
          error instanceof Error ? error.message : "Live предаването не можа да приключи.",
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
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
          {media.connected ? "Mock media · camera ready" : "Свързване с media provider..."}
        </Text>
        <Text style={styles.stageHint}>Тук по-късно влиза LiveKit SFU, не 1:1 WebRTC.</Text>
        <View style={styles.stageMeta}>
          <LiveViewerCount count={room.viewerCount} />
        </View>
      </View>
      {!keyboardVisible ? (
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
      ) : null}
      <LiveCommentList comments={room.comments} />
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
          <AppButton title="End Live" loading={ending} onPress={() => void onEnd()} />
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
  controls: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 10 },
  control: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  controlText: { fontWeight: "700" },
  footer: { paddingHorizontal: 16, gap: 12, paddingTop: 8, paddingBottom: 16 },
});
