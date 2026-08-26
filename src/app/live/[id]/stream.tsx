import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import LiveCommentComposer from "@/components/live/live-comment-composer";
import LiveCommentList from "@/components/live/live-comment-list";
import LiveStage from "@/components/live/live-stage";
import AppButton from "@/components/ui/AppButton";
import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import { useLiveFullscreenBack } from "@/hooks/live/useLiveFullscreenBack";
import { useLiveMedia } from "@/hooks/live/useLiveMedia";
import { useLiveRoom } from "@/hooks/live/useLiveRoom";
import { useAuth } from "@/hooks/useAuth";
import { endLive, getLive, listLiveComments } from "@/services/live";
import { isNetworkError } from "@/services/network-guard";
import { goToLiveCatalog } from "@/utils/live-navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  const { keyboardVisible, keyboardHeight } = useChatKeyboard();
  const leavingRef = useRef(false);
  const [title, setTitle] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [ending, setEnding] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const exitFullscreen = useCallback(() => setFullscreen(false), []);
  useLiveFullscreenBack(fullscreen, exitFullscreen);
  const composerOffset = fullscreen ? keyboardHeight : 0;
  const composerSafe = fullscreen && !keyboardVisible ? insets.bottom : 0;
  const overlayBottom = 64 + composerOffset + composerSafe;

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
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: fullscreen ? "#030712" : theme.colors.background },
      ]}
      behavior={fullscreen ? undefined : "padding"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <StatusBar
        hidden={fullscreen}
        style={colorScheme === "dark" || fullscreen ? "light" : "dark"}
      />
      {fullscreen ? null : <Header title={title || "Предаване на живо"} hideSearchButton />}
      <LiveStage
        connected={media.connected}
        viewerCount={room.viewerCount}
        reactions={room.reactions}
        fullscreen={fullscreen}
        keyboardVisible={keyboardVisible}
        label={media.connected ? "Предаваш на живо" : "Свързване..."}
        hint="Тук по-късно влиза LiveKit SFU, не 1:1 WebRTC."
        coverUri={coverUri}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
        onReact={room.sendReaction}
        topInset={fullscreen ? insets.top : 0}
        bottomInset={fullscreen ? overlayBottom : 16}
        topLeft={
          fullscreen ? (
            <TouchableOpacity
              style={styles.endChip}
              onPress={() => void onEnd()}
              disabled={ending}
            >
              <Text style={styles.endChipText}>{ending ? "..." : "Край"}</Text>
            </TouchableOpacity>
          ) : null
        }
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
      {fullscreen ? null : (
        <LiveCommentList
          comments={room.comments}
          onPressUser={openCommenterProfile}
          keyboardVisible={keyboardVisible}
        />
      )}
      {fullscreen ? (
        <View
          style={[
            styles.fullscreenComposer,
            {
              bottom: composerOffset,
              paddingBottom: composerSafe,
              backgroundColor: "#111827",
              zIndex: 40,
              elevation: 40,
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
            colors={theme.colors}
          />
        </View>
      ) : (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.colors.card,
              paddingBottom: keyboardVisible ? 0 : insets.bottom,
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
            colors={theme.colors}
          />
          {keyboardVisible ? null : (
            <View style={styles.footer}>
              <AppButton title="Приключи предаването" loading={ending} onPress={() => void onEnd()} />
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
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
  fullscreenComments: {
    position: "absolute",
    left: 0,
    right: 70,
    height: 180,
  },
  fullscreenComposer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  endChip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  endChipText: { color: "#ffffff", fontWeight: "800", fontSize: 12 },
});
