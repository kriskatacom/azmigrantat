import { useAppTheme } from "@/app/_layout";
import RemoteImage from "@/components/ui/RemoteImage";
import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import { showReportDialog } from "@/services/report-dialog";
import {
  createVideoComment,
  deleteVideoComment,
  likeVideoComment,
  listVideoCommentReplies,
  listVideoComments,
  unlikeVideoComment,
} from "@/services/video-comments";
import type { VideoComment } from "@/types/video-comments";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_SIZE = 20;

type ThreadState = {
  items: VideoComment[];
  hasMore: boolean;
  nextAfterId: number | null;
  loading: boolean;
  expanded: boolean;
};

type Props = {
  visible: boolean;
  token: string;
  videoId: number | null;
  initialCount?: number;
  onClose: () => void;
  onCountChange?: (count: number) => void;
  onOpenProfile?: (userId: number) => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.[0] ?? "?").toUpperCase();
}

function relativeTime(value: string | null): string {
  if (!value) return "сега";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "сега";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин.`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч.`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} д.`;
  return new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short" }).format(new Date(value));
}

export default function VideoCommentsSheet({
  visible,
  token,
  videoId,
  initialCount = 0,
  onClose,
  onCountChange,
  onOpenProfile,
}: Props) {
  const { theme, colorScheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { keyboardVisible, keyboardOverlap } = useChatKeyboard();
  const inputRef = useRef<TextInput>(null);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [threads, setThreads] = useState<Record<number, ThreadState>>({});
  const [replyTarget, setReplyTarget] = useState<VideoComment | null>(null);
  const [body, setBody] = useState("");
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount, videoId]);

  useEffect(() => {
    if (!visible || !videoId) return;
    const controller = new AbortController();
    setLoading(true);
    setComments([]);
    setThreads({});
    setReplyTarget(null);
    setBody("");
    void listVideoComments(token, videoId, { limit: PAGE_SIZE, signal: controller.signal })
      .then((response) => {
        setComments(response.data);
        setHasMore(response.pagination.has_more);
        setNextBeforeId(response.pagination.next_before_id);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        Alert.alert("Коментарите не са налични", error instanceof Error ? error.message : "Опитайте отново.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token, videoId, visible]);

  const emitCount = useCallback((next: number) => {
    const safe = Math.max(0, next);
    setCount(safe);
    onCountChange?.(safe);
  }, [onCountChange]);

  const loadMore = useCallback(async () => {
    if (!videoId || !hasMore || loadingMore || !nextBeforeId) return;
    setLoadingMore(true);
    try {
      const response = await listVideoComments(token, videoId, {
        limit: PAGE_SIZE,
        beforeId: nextBeforeId,
      });
      setComments((current) => {
        const ids = new Set(current.map((comment) => comment.id));
        return [...current, ...response.data.filter((comment) => !ids.has(comment.id))];
      });
      setHasMore(response.pagination.has_more);
      setNextBeforeId(response.pagination.next_before_id);
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Още коментари не можаха да бъдат заредени.");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextBeforeId, token, videoId]);

  const loadReplies = useCallback(async (root: VideoComment, append = false) => {
    const existing = threads[root.id];
    if (existing?.loading) return;
    setThreads((current) => ({
      ...current,
      [root.id]: {
        items: append ? current[root.id]?.items ?? [] : [],
        hasMore: current[root.id]?.hasMore ?? false,
        nextAfterId: current[root.id]?.nextAfterId ?? null,
        loading: true,
        expanded: true,
      },
    }));
    try {
      const response = await listVideoCommentReplies(token, root.id, {
        limit: PAGE_SIZE,
        afterId: append ? existing?.nextAfterId : null,
      });
      setThreads((current) => {
        const previous = append ? current[root.id]?.items ?? [] : [];
        const ids = new Set(previous.map((comment) => comment.id));
        return {
          ...current,
          [root.id]: {
            items: [...previous, ...response.data.filter((comment) => !ids.has(comment.id))],
            hasMore: response.pagination.has_more,
            nextAfterId: response.pagination.next_after_id,
            loading: false,
            expanded: true,
          },
        };
      });
    } catch (error) {
      setThreads((current) => ({
        ...current,
        [root.id]: { ...(current[root.id] ?? { items: [] }), loading: false, expanded: true, hasMore: false, nextAfterId: null },
      }));
      Alert.alert("Грешка", error instanceof Error ? error.message : "Отговорите не можаха да бъдат заредени.");
    }
  }, [threads, token]);

  const updateComment = useCallback((next: VideoComment) => {
    if (!next.root_id) {
      setComments((current) => current.map((comment) => comment.id === next.id ? next : comment));
      return;
    }
    setThreads((current) => {
      const thread = current[next.root_id!];
      if (!thread) return current;
      return {
        ...current,
        [next.root_id!]: {
          ...thread,
          items: thread.items.map((comment) => comment.id === next.id ? next : comment),
        },
      };
    });
  }, []);

  const toggleLike = useCallback(async (comment: VideoComment) => {
    if (comment.status !== "active") return;
    const optimistic = {
      ...comment,
      liked_by_me: !comment.liked_by_me,
      likes_count: Math.max(0, comment.likes_count + (comment.liked_by_me ? -1 : 1)),
    };
    updateComment(optimistic);
    try {
      const response = comment.liked_by_me
        ? await unlikeVideoComment(token, comment.id)
        : await likeVideoComment(token, comment.id);
      updateComment(response.data);
    } catch (error) {
      updateComment(comment);
      Alert.alert("Грешка", error instanceof Error ? error.message : "Реакцията не беше запазена.");
    }
  }, [token, updateComment]);

  const beginReply = useCallback((comment: VideoComment) => {
    if (comment.status !== "active") return;
    setReplyTarget(comment);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const send = useCallback(async () => {
    const trimmed = body.trim();
    if (!videoId || !trimmed || sending) return;
    setSending(true);
    try {
      const response = await createVideoComment(token, videoId, trimmed, replyTarget?.id);
      const created = response.data;
      if (!created.root_id) {
        setComments((current) => [created, ...current]);
      } else {
        const rootId = created.root_id;
        setComments((current) => current.map((comment) => comment.id === rootId
          ? { ...comment, replies_count: comment.replies_count + 1 }
          : comment));
        setThreads((current) => {
          const thread = current[rootId];
          return {
            ...current,
            [rootId]: {
              items: [...(thread?.items ?? []), created],
              hasMore: thread?.hasMore ?? false,
              nextAfterId: created.id,
              loading: false,
              expanded: true,
            },
          };
        });
      }
      emitCount(count + 1);
      setBody("");
      setReplyTarget(null);
    } catch (error) {
      Alert.alert("Коментарът не е изпратен", error instanceof Error ? error.message : "Опитайте отново.");
    } finally {
      setSending(false);
    }
  }, [body, count, emitCount, replyTarget?.id, sending, token, videoId]);

  const removeComment = useCallback(async (comment: VideoComment) => {
    try {
      const response = await deleteVideoComment(token, comment.id);
      const deleted = response.data;
      if (!comment.root_id) {
        setComments((current) => deleted.replies_count > 0
          ? current.map((item) => item.id === deleted.id ? deleted : item)
          : current.filter((item) => item.id !== deleted.id));
      } else {
        setThreads((current) => {
          const thread = current[comment.root_id!];
          if (!thread) return current;
          return {
            ...current,
            [comment.root_id!]: {
              ...thread,
              items: thread.items.filter((item) => item.id !== comment.id),
            },
          };
        });
        setComments((current) => current.map((item) => item.id === comment.root_id
          ? { ...item, replies_count: Math.max(0, item.replies_count - 1) }
          : item));
      }
      emitCount(count - 1);
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Коментарът не беше изтрит.");
    }
  }, [count, emitCount, token]);

  const openActions = useCallback((comment: VideoComment) => {
    if (comment.status !== "active") return;
    const actions = comment.can_delete
      ? [{
          text: "Изтрий",
          style: "destructive" as const,
          onPress: () => Alert.alert("Изтриване на коментар", "Да изтриете ли този коментар?", [
            { text: "Отказ", style: "cancel" },
            { text: "Изтрий", style: "destructive", onPress: () => void removeComment(comment) },
          ]),
        }]
      : [{ text: "Докладвай", onPress: () => showReportDialog(token, "video_comment", comment.id) }];
    Alert.alert("Коментар", undefined, [...actions, { text: "Отказ", style: "cancel" }]);
  }, [removeComment, token]);

  const title = useMemo(() => `${count} ${count === 1 ? "коментар" : "коментара"}`, [count]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Затвори коментарите" />
        <View
          style={[
            styles.panel,
            { backgroundColor: theme.colors.background, paddingBottom: Math.max(insets.bottom, 10) },
            keyboardVisible && { marginBottom: keyboardOverlap, height: "50%" },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Затвори коментарите">
              <Ionicons name="close" size={25} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} size="large" color={theme.colors.primary} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onEndReached={() => void loadMore()}
              onEndReachedThreshold={0.5}
              renderItem={({ item }) => {
                const thread = threads[item.id];
                return (
                  <View>
                    <CommentRow
                      comment={item}
                      onLike={toggleLike}
                      onReply={beginReply}
                      onActions={openActions}
                      onOpenProfile={onOpenProfile}
                    />
                    {item.replies_count > 0 ? (
                      <View style={styles.threadArea}>
                        {!thread?.expanded ? (
                          <TouchableOpacity onPress={() => void loadReplies(item)} style={styles.repliesToggle}>
                            <View style={[styles.replyRule, { backgroundColor: theme.colors.border }]} />
                            <Text style={[styles.repliesText, { color: theme.colors.textSecondary }]}>Виж {item.replies_count} отговора</Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            {thread.items.map((reply) => (
                              <CommentRow
                                key={reply.id}
                                comment={reply}
                                compact
                                onLike={toggleLike}
                                onReply={beginReply}
                                onActions={openActions}
                                onOpenProfile={onOpenProfile}
                              />
                            ))}
                            {thread.loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
                            {thread.hasMore && !thread.loading ? (
                              <TouchableOpacity onPress={() => void loadReplies(item, true)} style={styles.repliesToggle}>
                                <View style={[styles.replyRule, { backgroundColor: theme.colors.border }]} />
                                <Text style={[styles.repliesText, { color: theme.colors.textSecondary }]}>Виж още отговори</Text>
                              </TouchableOpacity>
                            ) : null}
                            {!thread.hasMore && !thread.loading ? (
                              <TouchableOpacity
                                onPress={() => setThreads((current) => ({ ...current, [item.id]: { ...current[item.id], expanded: false } }))}
                                style={styles.repliesToggle}
                              >
                                <Text style={[styles.repliesText, { color: theme.colors.textSecondary }]}>Скрий отговорите</Text>
                              </TouchableOpacity>
                            ) : null}
                          </>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={42} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Все още няма коментари</Text>
                  <Text style={[styles.emptyBody, { color: theme.colors.textSecondary }]}>Бъдете първият, който ще напише нещо.</Text>
                </View>
              }
              ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} /> : null}
            />
          )}

          {replyTarget ? (
            <View style={[styles.replyBanner, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
              <Text style={[styles.replyBannerText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                Отговор до <Text style={{ color: theme.colors.primary, fontWeight: "800" }}>@{replyTarget.user?.name ?? "Потребител"}</Text>
              </Text>
              <TouchableOpacity onPress={() => setReplyTarget(null)} accessibilityLabel="Откажи отговора">
                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={[styles.composer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
            <TextInput
              ref={inputRef}
              value={body}
              onChangeText={setBody}
              placeholder={replyTarget ? `Отговор до @${replyTarget.user?.name ?? "Потребител"}` : "Добавете коментар…"}
              placeholderTextColor={theme.colors.placeholder}
              keyboardAppearance={colorScheme}
              multiline
              maxLength={1000}
              style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.input, borderColor: theme.colors.inputBorder }]}
              accessibilityLabel="Текст на коментара"
            />
            <TouchableOpacity
              onPress={() => void send()}
              disabled={!body.trim() || sending}
              style={[styles.send, { opacity: body.trim() && !sending ? 1 : 0.35 }]}
              accessibilityLabel="Изпрати коментара"
            >
              {sending
                ? <ActivityIndicator size="small" color={theme.colors.primary} />
                : <Ionicons name="arrow-up-circle" size={34} color={theme.colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CommentRow({
  comment,
  compact = false,
  onLike,
  onReply,
  onActions,
  onOpenProfile,
}: {
  comment: VideoComment;
  compact?: boolean;
  onLike: (comment: VideoComment) => void;
  onReply: (comment: VideoComment) => void;
  onActions: (comment: VideoComment) => void;
  onOpenProfile?: (userId: number) => void;
}) {
  const { theme } = useAppTheme();
  const name = comment.user?.name ?? "Потребител";
  const openProfile = comment.user && onOpenProfile ? () => onOpenProfile(comment.user!.id) : undefined;

  return (
    <Pressable onLongPress={() => onActions(comment)} style={[styles.commentRow, compact && styles.compactRow]}>
      <Pressable onPress={openProfile} disabled={!openProfile}>
        {comment.user?.profile_image ? (
          <RemoteImage uri={comment.user.profile_image} style={[styles.avatar, compact && styles.compactAvatar]} />
        ) : (
          <View style={[styles.avatar, compact && styles.compactAvatar, styles.avatarFallback, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
        )}
      </Pressable>
      <View style={styles.commentContent}>
        <Pressable onPress={openProfile} disabled={!openProfile}>
          <Text style={[styles.commentName, { color: theme.colors.textSecondary }]} numberOfLines={1}>{name}</Text>
        </Pressable>
        {comment.status === "deleted" ? (
          <Text style={[styles.deletedText, { color: theme.colors.textSecondary }]}>Коментарът е изтрит</Text>
        ) : (
          <Text style={[styles.commentBody, { color: theme.colors.text }]}>
            {comment.reply_to_user ? <Text style={{ color: theme.colors.primary }}>@{comment.reply_to_user.name} </Text> : null}
            {comment.body}
          </Text>
        )}
        <View style={styles.commentMeta}>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{relativeTime(comment.created_at)}</Text>
          {comment.status === "active" ? (
            <TouchableOpacity onPress={() => onReply(comment)}><Text style={[styles.replyAction, { color: theme.colors.textSecondary }]}>Отговор</Text></TouchableOpacity>
          ) : null}
          {comment.status === "active" ? (
            <TouchableOpacity onPress={() => onActions(comment)} accessibilityLabel="Още действия за коментара">
              <Ionicons name="ellipsis-horizontal" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {comment.status === "active" ? (
        <TouchableOpacity onPress={() => void onLike(comment)} style={styles.likeButton} accessibilityLabel={comment.liked_by_me ? "Премахни харесването" : "Харесай коментара"}>
          <Ionicons name={comment.liked_by_me ? "heart" : "heart-outline"} size={20} color={comment.liked_by_me ? "#fe2c55" : theme.colors.textSecondary} />
          {comment.likes_count > 0 ? <Text style={[styles.likeCount, { color: theme.colors.textSecondary }]}>{comment.likes_count}</Text> : null}
        </TouchableOpacity>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.48)" },
  panel: { height: "50%", borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: "hidden" },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 8 },
  header: { minHeight: 52, alignItems: "center", justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 15, fontWeight: "800" },
  close: { position: "absolute", right: 10, width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  loader: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingVertical: 8, flexGrow: 1 },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 9 },
  compactRow: { paddingLeft: 42, paddingVertical: 7 },
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: "hidden" },
  compactAvatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  commentContent: { flex: 1, minWidth: 0 },
  commentName: { fontSize: 13, fontWeight: "700", marginBottom: 3 },
  commentBody: { fontSize: 15, lineHeight: 20 },
  deletedText: { fontSize: 14, lineHeight: 20, fontStyle: "italic" },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 6 },
  metaText: { fontSize: 12 },
  replyAction: { fontSize: 12, fontWeight: "800" },
  likeButton: { width: 34, minHeight: 42, alignItems: "center", justifyContent: "center", gap: 1 },
  likeCount: { fontSize: 11, fontWeight: "700" },
  threadArea: { marginLeft: 42 },
  repliesToggle: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 34, paddingLeft: 10 },
  replyRule: { width: 24, height: 1 },
  repliesText: { fontSize: 12, fontWeight: "800" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 70, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "900" },
  emptyBody: { fontSize: 13, textAlign: "center" },
  replyBanner: { minHeight: 34, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth },
  replyBannerText: { flex: 1, fontSize: 12 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 42, maxHeight: 104, borderWidth: 1, borderRadius: 21, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 9, fontSize: 15 },
  send: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
});
