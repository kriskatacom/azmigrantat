import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import LiveCommentComposer from "@/components/live/live-comment-composer";
import LiveCommentList from "@/components/live/live-comment-list";
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
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
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
  const { keyboardVisible, keyboardHeight } = useChatKeyboard();
  const leavingRef = useRef(false);
  const [title, setTitle] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [comment, setComment] = useState("");
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
        label={media.connected ? "Гледаш предаване на живо" : "Присъединяване..."}
        hint="Медията ще идва от SFU, не от peer-to-peer call."
        coverUri={coverUri}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
        onReact={room.sendReaction}
        topInset={fullscreen ? insets.top : 0}
        bottomInset={fullscreen ? overlayBottom : 16}
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
      {fullscreen ? null : (
        <LiveCommentList
          comments={room.comments}
          onPressUser={openCommenterProfile}
          keyboardVisible={keyboardVisible}
        />
      )}
      <View
        style={
          fullscreen
            ? [
                styles.fullscreenComposer,
                {
                  bottom: composerOffset,
                  paddingBottom: composerSafe,
                  backgroundColor: "#111827",
                  zIndex: 40,
                  elevation: 40,
                },
              ]
            : {
                backgroundColor: theme.colors.card,
                paddingBottom: keyboardVisible ? 0 : insets.bottom,
              }
        }
      >
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
    </KeyboardAvoidingView>
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
