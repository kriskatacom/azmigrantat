import { useAppTheme } from "@/app/_layout";
import ConfirmModal from "@/components/ui/ConfirmModal";
import RemoteImage from "@/components/ui/RemoteImage";
import ProfileVideoPlayer from "@/components/video/profile-video-player";
import VideoEditModal from "@/components/video/video-edit-modal";
import { toPublicFileUrl } from "@/utils/public-file-url";
import { phoneDisplayParts } from "@/constants/european-dial-codes";
import { useAuth } from "@/hooks/useAuth";
import { createDirectConversation } from "@/services/chat";
import { deleteVideo, getVideoPlayback, updateVideo, uploadVideoThumbnail } from "@/services/videos";
import {
  blockUserByCode,
  getPublicProfile,
  type PublicUserProfile,
} from "@/services/profile";
import { copyText } from "@/utils/copy-text";
import type { VideoItem } from "@/types/video";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function genderLabel(gender: PublicUserProfile["gender"]): string | null {
  if (gender === "male") return "Мъж";
  if (gender === "female") return "Жена";
  if (gender === "other") return "Друг";
  if (gender === "prefer_not_to_say") return "Предпочита да не казва";
  return null;
}

export default function PublicUserProfileScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const callNavigationLockedRef = useRef(false);
  const callNavigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const userId = useMemo(() => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const parsed = rawId ? Number(rawId) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
  }, [params.id]);

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [activeSection, setActiveSection] = useState<"about" | "videos">("about");
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isOpeningVideo, setIsOpeningVideo] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnail, setEditThumbnail] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState<VideoItem | null>(null);

  useEffect(() => {
    return () => {
      if (callNavigationTimerRef.current) {
        clearTimeout(callNavigationTimerRef.current);
      }
    };
  }, []);

  const loadProfile = useCallback(async () => {
    if (!token || !Number.isInteger(userId)) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setProfile(await getPublicProfile(token, userId));
    } catch (error) {
      setProfile(null);
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Профилът не можа да бъде зареден.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (isAuthLoading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const displayName =
    profile?.name?.trim() ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
    "Потребител";
  const handle = profile?.username
    ? `@${profile.username}`
    : profile?.public_code ?? null;
  const phoneParts = profile?.phone ? phoneDisplayParts(profile.phone) : null;
  const shownGender = genderLabel(profile?.gender ?? null);
  const coverUri = profile?.cover_image ?? null;

  const openChat = async () => {
    if (!token || !profile || isBusy) return;
    setIsBusy(true);
    try {
      const conversation = await createDirectConversation(token, profile.id);
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: String(conversation.id),
          userId: String(profile.id),
          title: conversation.other_user?.name ?? displayName,
          image:
            conversation.other_user?.profile_image ??
            profile.profile_image ??
            "",
        },
      });
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Чатът не можа да бъде отворен.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const openCall = (callType: "audio" | "video") => {
    if (!profile || callNavigationLockedRef.current) return;

    callNavigationLockedRef.current = true;
    callNavigationTimerRef.current = setTimeout(() => {
      callNavigationLockedRef.current = false;
      callNavigationTimerRef.current = null;
    }, 1_000);

    router.push({
      pathname: "/video-call/[userId]",
      params: {
        userId: String(profile.id),
        name: displayName,
        image: profile.profile_image ?? "",
        callType,
        autoStart: "1",
      },
    });
  };

  const callPhone = () => {
    if (!phoneParts?.e164) return;
    void Linking.openURL(`tel:${phoneParts.e164}`);
  };

  const handleBlock = async () => {
    if (!token || !profile?.public_code) return;
    setConfirmBlock(false);
    setIsBusy(true);
    try {
      await blockUserByCode(token, profile.public_code);
      await loadProfile();
      Alert.alert("Готово", "Потребителят беше блокиран.");
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Потребителят не можа да бъде блокиран.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const copyHandle = () => {
    const value = profile?.public_code ?? profile?.username;
    if (!value) return;
    void copyText(value).then(() => {
      Alert.alert("Код на потребителя", value);
    });
  };

  const openVideo = async (video: VideoItem) => {
    if (!token || isOpeningVideo || video.status !== "ready") return;
    setIsOpeningVideo(true);
    try {
      const playback = await getVideoPlayback(token, video.id);
      setSelectedVideo(video);
      setPlaybackUrl(playback.data.url);
    } catch (error) {
      console.error("[VideoPlayback] Видеото не можа да бъде отворено.", error);
    } finally {
      setIsOpeningVideo(false);
    }
  };

  const closeVideo = () => {
    setPlaybackUrl(null);
    setSelectedVideo(null);
  };

  const startEditingVideo = (video: VideoItem) => {
    if (!profile?.is_self) return;
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description ?? "");
    setEditThumbnail(null);
  };

  const chooseEditThumbnail = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Нужен е достъп до снимките", "Разрешете достъп до снимките от настройките на телефона.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });
    if (!result.canceled) setEditThumbnail(result.assets[0]);
  };

  const saveVideo = async () => {
    if (!token || !editingVideo || !editTitle.trim() || isSavingVideo) return;
    setIsSavingVideo(true);
    try {
      await updateVideo(token, editingVideo.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      if (editThumbnail) {
        await uploadVideoThumbnail(token, editingVideo.id, {
          uri: editThumbnail.uri,
          name: editThumbnail.fileName ?? "thumbnail.jpg",
          mimeType: editThumbnail.mimeType ?? "image/jpeg",
        });
      }
      setEditingVideo(null);
      await loadProfile();
      Alert.alert("Готово", "Видеото беше редактирано.");
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Видеото не можа да бъде редактирано.");
    } finally {
      setIsSavingVideo(false);
    }
  };

  const confirmDeleteVideo = async () => {
    if (!token || !deletingVideo || isSavingVideo) return;
    setIsSavingVideo(true);
    try {
      await deleteVideo(token, deletingVideo.id);
      setDeletingVideo(null);
      await loadProfile();
      Alert.alert("Готово", "Видеото беше изтрито.");
    } catch (error) {
      Alert.alert("Грешка", error instanceof Error ? error.message : "Видеото не можа да бъде изтрито.");
    } finally {
      setIsSavingVideo(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : !profile ? (
        <View style={styles.empty}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.overlayBack, { top: insets.top + 8 }]}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            <FontAwesome name="chevron-left" size={18} color="#ffffff" />
          </Pressable>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Профилът не е намерен
          </Text>
        </View>
      ) : (
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
        >
          <ImageBackground
            source={
              coverUri ? { uri: toPublicFileUrl(coverUri) ?? coverUri } : undefined
            }
            style={styles.cover}
            imageStyle={styles.coverImage}
          >
            <View
              style={[
                styles.coverScrim,
                {
                  backgroundColor: coverUri
                    ? "rgba(15, 23, 42, 0.45)"
                    : theme.colors.primary,
                },
              ]}
            />
            <Pressable
              onPress={() => router.back()}
              style={[styles.overlayBack, { top: insets.top + 8 }]}
              accessibilityRole="button"
              accessibilityLabel="Назад"
            >
              <FontAwesome name="chevron-left" size={18} color="#ffffff" />
            </Pressable>
            {!profile.is_self && profile.public_code && !profile.is_blocked_by_me ? (
              <Pressable
                onPress={() => setConfirmBlock(true)}
                style={[styles.overlayMore, { top: insets.top + 8 }]}
                accessibilityRole="button"
                accessibilityLabel="Още опции"
              >
                <FontAwesome name="ellipsis-h" size={18} color="#ffffff" />
              </Pressable>
            ) : null}
          </ImageBackground>

          <View style={styles.identity}>
            <View
              style={[
                styles.avatarRing,
                { backgroundColor: theme.colors.background },
              ]}
            >
              {profile.profile_image ? (
                <RemoteImage uri={profile.profile_image} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <FontAwesome
                    name="user"
                    size={44}
                    color={theme.colors.textSecondary}
                  />
                </View>
              )}
            </View>

            <Text style={[styles.name, { color: theme.colors.text }]}>
              {displayName}
            </Text>
            {handle ? (
              <TouchableOpacity
                onPress={copyHandle}
                accessibilityRole="button"
                accessibilityLabel={`Копирай ${handle}`}
              >
                <Text style={[styles.handle, { color: theme.colors.textSecondary }]}>
                  {handle}
                </Text>
              </TouchableOpacity>
            ) : null}

            {profile.bio ? (
              <Text style={[styles.bio, { color: theme.colors.text }]}>
                {profile.bio}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              {profile.location ? (
                <MetaChip
                  icon="map-marker"
                  label={profile.location}
                  colors={theme.colors}
                />
              ) : null}
              {shownGender ? (
                <MetaChip icon="user" label={shownGender} colors={theme.colors} />
              ) : null}
              <MetaChip
                icon="circle"
                label={profile.is_active ? "Активен" : "Неактивен"}
                colors={theme.colors}
                accent={profile.is_active ? theme.colors.success : undefined}
              />
            </View>
          </View>

          {profile.can_contact ? (
            <View style={styles.ctaRow}>
              <CtaButton
                title="Съобщение"
                icon="comment"
                primary
                colors={theme.colors}
                disabled={isBusy}
                onPress={() => void openChat()}
              />
              <CtaButton
                title="Обаждане"
                icon="phone"
                colors={theme.colors}
                disabled={isBusy}
                onPress={() => openCall("audio")}
              />
              <IconCta
                icon="video-camera"
                label="Видео обаждане"
                colors={theme.colors}
                disabled={isBusy}
                onPress={() => openCall("video")}
              />
              {phoneParts?.e164 ? (
                <IconCta
                  icon="mobile"
                  label="Обади се на телефона"
                  colors={theme.colors}
                  disabled={isBusy}
                  onPress={callPhone}
                />
              ) : null}
            </View>
          ) : null}

          {profile.is_self ? (
            <View style={styles.ctaRow}>
              <CtaButton
                title="Моят профил"
                icon="lock"
                primary
                colors={theme.colors}
                onPress={() => router.push("/(profile)")}
              />
              <IconCta
                icon="cog"
                label="Поверителност"
                colors={theme.colors}
                onPress={() => router.push("/(profile)/settings")}
              />
            </View>
          ) : null}

          {profile.is_blocked_me || profile.is_blocked_by_me ? (
            <Text style={[styles.notice, { color: theme.colors.textSecondary }]}>
              {profile.is_blocked_me
                ? "Не можете да се свържете с този потребител."
                : "Блокирали сте този потребител. Съобщения и обаждания не са възможни."}
            </Text>
          ) : null}

          <View style={[styles.sectionTabs, { backgroundColor: theme.colors.surface }]}>
            <Pressable
              onPress={() => setActiveSection("about")}
              style={[styles.sectionTab, activeSection === "about" && { backgroundColor: theme.colors.card }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeSection === "about" }}
            >
              <Text style={[styles.sectionTabText, { color: activeSection === "about" ? theme.colors.text : theme.colors.textSecondary }]}>За мен</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveSection("videos")}
              style={[styles.sectionTab, activeSection === "videos" && { backgroundColor: theme.colors.card }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeSection === "videos" }}
            >
              <Text style={[styles.sectionTabText, { color: activeSection === "videos" ? theme.colors.text : theme.colors.textSecondary }]}>Видеоклипове</Text>
            </Pressable>
          </View>

          {activeSection === "about" ? <View
            style={[
              styles.aboutCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.aboutTitle, { color: theme.colors.text }]}>За мен</Text>
            {profile.username ? (
              <AboutRow
                icon="at"
                text={profile.username}
                colors={theme.colors}
              />
            ) : null}
            {profile.public_code ? (
              <AboutRow
                icon="id-badge"
                text={profile.public_code}
                colors={theme.colors}
                onPress={copyHandle}
              />
            ) : null}
            {profile.location ? (
              <AboutRow
                icon="map-marker"
                text={`Живее в ${profile.location}`}
                colors={theme.colors}
              />
            ) : null}
            {shownGender ? (
              <AboutRow icon="user" text={shownGender} colors={theme.colors} />
            ) : null}
            {phoneParts?.display ? (
              <AboutRow
                icon="phone"
                text={`${phoneParts.flag} ${phoneParts.display}`.trim()}
                colors={theme.colors}
                onPress={phoneParts.e164 ? callPhone : undefined}
              />
            ) : (
              <AboutRow
                icon="phone"
                text={
                  profile.is_self
                    ? profile.phone_verified
                      ? "Телефонът е скрит за другите"
                      : "Няма потвърден телефон"
                    : "Телефонът е скрит"
                }
                colors={theme.colors}
                muted
              />
            )}
            {profile.is_self && profile.email ? (
              <AboutRow
                icon="envelope"
                text={profile.email}
                colors={theme.colors}
              />
            ) : null}
            {profile.is_self && profile.address ? (
              <AboutRow
                icon="home"
                text={profile.address}
                colors={theme.colors}
              />
            ) : null}
            {profile.is_self ? (
              <Text
                style={[styles.hint, { color: theme.colors.textSecondary }]}
              >
                Имейлът и адресът се виждат само от вас. Телефонът е публичен
                само ако е потвърден и сте го разрешили.
              </Text>
            ) : null}
          </View> : <VideosSection
            videos={profile.videos ?? []}
            colors={theme.colors}
            onOpenVideo={openVideo}
            isOpeningVideo={isOpeningVideo}
            canManage={profile.is_self}
            onEditVideo={startEditingVideo}
            onDeleteVideo={setDeletingVideo}
            isManaging={isSavingVideo}
          />}
        </ScrollView>
      )}

      <ConfirmModal
        visible={confirmBlock}
        title="Блокиране"
        message={`Да блокирате ли ${displayName}?`}
        confirmText="Блокирай"
        destructive
        onConfirm={() => void handleBlock()}
        onCancel={() => setConfirmBlock(false)}
      />
      <ConfirmModal
        visible={Boolean(deletingVideo)}
        title="Изтриване на видео"
        message={`Видеото „${deletingVideo?.title ?? ""}“ ще бъде изтрито от Bunny Stream и профила. Това действие не може да бъде отменено.`}
        confirmText="Изтрий видеото"
        destructive
        onConfirm={() => void confirmDeleteVideo()}
        onCancel={() => setDeletingVideo(null)}
      />
      <VideoEditModal
        visible={Boolean(editingVideo)}
        title={editTitle}
        description={editDescription}
        thumbnailUri={editThumbnail?.uri ?? null}
        busy={isSavingVideo}
        onChangeTitle={setEditTitle}
        onChangeDescription={setEditDescription}
        onChooseThumbnail={() => void chooseEditThumbnail()}
        onSave={() => void saveVideo()}
        onCancel={() => setEditingVideo(null)}
      />
      <ProfileVideoPlayer
        visible={Boolean(selectedVideo && playbackUrl)}
        title={selectedVideo?.title ?? "Видео"}
        description={selectedVideo?.description ?? null}
        url={playbackUrl}
        onClose={closeVideo}
        colors={theme.colors}
      />
    </View>
  );
}

function VideosSection({
  videos,
  colors,
  onOpenVideo,
  isOpeningVideo,
  canManage,
  onEditVideo,
  onDeleteVideo,
  isManaging,
}: {
  videos: VideoItem[];
  colors: { card: string; border: string; text: string; textSecondary: string; surface: string; icon: string };
  onOpenVideo: (video: VideoItem) => void;
  isOpeningVideo: boolean;
  canManage: boolean;
  onEditVideo: (video: VideoItem) => void;
  onDeleteVideo: (video: VideoItem) => void;
  isManaging: boolean;
}) {
  return (
    <View style={[styles.videosCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.aboutTitle, { color: colors.text }]}>Видеоклипове</Text>
      {videos.length === 0 ? (
        <Text style={[styles.emptyVideos, { color: colors.textSecondary }]}>Този потребител все още няма видеоклипове.</Text>
      ) : (
        videos.map((video) => (
          <Pressable
            key={video.id}
            onPress={() => onOpenVideo(video)}
            disabled={isOpeningVideo || video.status !== "ready"}
            style={[styles.videoItem, { borderColor: colors.border }, video.status !== "ready" && styles.processingVideoItem]}
            accessibilityRole="button"
            accessibilityLabel={video.status !== "ready" ? `${video.title} — обработва се` : "Пусни " + video.title}
          >
            {video.thumbnail_url ? (
              <RemoteImage uri={video.thumbnail_url} style={styles.videoThumbnail} />
            ) : (
              <View style={[styles.videoThumbnail, styles.videoPlaceholder, { backgroundColor: colors.surface }]}>
                <FontAwesome name="video-camera" size={26} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.videoDetails}>
              <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>{video.title}</Text>
              {video.description ? <Text style={[styles.videoDescription, { color: colors.textSecondary }]} numberOfLines={2}>{video.description}</Text> : null}
              {video.status !== "ready" ? <Text style={[styles.videoStatus, { color: colors.textSecondary }]}>Видеото се обработва — ще бъде достъпно за гледане скоро.</Text> : null}
              {canManage ? (
                <View style={styles.videoActions}>
                  <TouchableOpacity onPress={() => onEditVideo(video)} disabled={isManaging} accessibilityRole="button">
                    <Text style={[styles.videoActionText, { color: colors.icon }]}>Редактирай</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDeleteVideo(video)} disabled={isManaging} accessibilityRole="button">
                    <Text style={[styles.videoActionText, { color: colors.textSecondary }]}>Изтрий</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

function MetaChip({
  icon,
  label,
  colors,
  accent,
}: {
  icon: ComponentProps<typeof FontAwesome>["name"];
  label: string;
  colors: { surface: string; textSecondary: string };
  accent?: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: colors.surface }]}>
      <FontAwesome name={icon} size={11} color={accent ?? colors.textSecondary} />
      <Text style={[styles.chipText, { color: accent ?? colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

function CtaButton({
  title,
  icon,
  primary,
  colors,
  disabled,
  onPress,
}: {
  title: string;
  icon: ComponentProps<typeof FontAwesome>["name"];
  primary?: boolean;
  colors: { primary: string; surface: string; text: string; buttonText: string };
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.cta,
        {
          backgroundColor: primary ? colors.primary : colors.surface,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <FontAwesome
        name={icon}
        size={15}
        color={primary ? colors.buttonText : colors.text}
      />
      <Text
        style={[
          styles.ctaText,
          { color: primary ? colors.buttonText : colors.text },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function IconCta({
  icon,
  label,
  colors,
  disabled,
  onPress,
}: {
  icon: ComponentProps<typeof FontAwesome>["name"];
  label: string;
  colors: { surface: string; text: string };
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.iconCta, { backgroundColor: colors.surface }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <FontAwesome name={icon} size={16} color={colors.text} />
    </TouchableOpacity>
  );
}

function AboutRow({
  icon,
  text,
  colors,
  muted,
  onPress,
}: {
  icon: ComponentProps<typeof FontAwesome>["name"];
  text: string;
  colors: { text: string; textSecondary: string; icon: string };
  muted?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.aboutRow}>
      <FontAwesome
        name={icon}
        size={16}
        color={muted ? colors.textSecondary : colors.icon}
        style={styles.aboutIcon}
      />
      <Text
        selectable={!onPress}
        style={[
          styles.aboutText,
          { color: muted ? colors.textSecondary : colors.text },
        ]}
      >
        {text}
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button">
      {content}
    </TouchableOpacity>
  );
}

const AVATAR = 118;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  content: { paddingBottom: 40 },
  cover: {
    height: 188,
    width: "100%",
    backgroundColor: "#1d4ed8",
  },
  coverImage: { resizeMode: "cover" },
  coverScrim: {
    ...StyleSheet.absoluteFill,
  },
  overlayBack: {
    position: "absolute",
    left: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 2,
  },
  overlayMore: {
    position: "absolute",
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 2,
  },
  identity: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: -(AVATAR / 2),
  },
  avatarRing: {
    width: AVATAR + 8,
    height: AVATAR + 8,
    borderRadius: (AVATAR + 8) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  handle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "600",
  },
  bio: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: "700" },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  cta: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  ctaText: { fontSize: 15, fontWeight: "700" },
  iconCta: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: {
    marginTop: 14,
    paddingHorizontal: 20,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  aboutCard: {
    marginTop: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  aboutTitle: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  aboutRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  aboutIcon: { width: 18, marginTop: 2, textAlign: "center" },
  aboutText: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: "500" },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionTabs: {
    flexDirection: "row",
    marginTop: 22,
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  sectionTab: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 9 },
  sectionTabText: { fontSize: 14, fontWeight: "800" },
  videosCard: { marginTop: 14, marginHorizontal: 16, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  emptyVideos: { fontSize: 14, lineHeight: 20 },
  videoItem: { flexDirection: "row", gap: 12, paddingTop: 12, borderTopWidth: 1 },
  processingVideoItem: { opacity: 0.72 },
  videoThumbnail: { width: 112, height: 72, borderRadius: 10 },
  videoPlaceholder: { alignItems: "center", justifyContent: "center" },
  videoDetails: { flex: 1, gap: 5, justifyContent: "center" },
  videoTitle: { fontSize: 15, fontWeight: "800", lineHeight: 20 },
  videoDescription: { fontSize: 13, lineHeight: 18 },
  videoStatus: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  videoActions: { flexDirection: "row", gap: 14, marginTop: 3 },
  videoActionText: { fontSize: 12, fontWeight: "800" },
});
