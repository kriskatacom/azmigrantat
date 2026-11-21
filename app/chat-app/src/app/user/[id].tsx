import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ChatMoreOptionsModal from "@/components/chat/chat-more-options-modal";
import RemoteImage from "@/components/ui/RemoteImage";
import ProfileVideoPager from "@/components/video/profile-video-pager";
import { getVideoDisplayTitle } from "@/constants/featured-video";
import ProfileBusinessCard from "@/components/profile/profile-business-card";
import VideoEditModal from "@/components/video/video-edit-modal";
import { toPublicFileUrl } from "@/utils/public-file-url";
import { phoneDisplayParts } from "@/constants/european-dial-codes";
import { useAuth } from "@/hooks/useAuth";
import { createDirectConversation } from "@/services/chat";
import { deleteVideo, getVideoPlayback, listSavedVideos, recordVideoView, updateVideo, uploadVideoThumbnail } from "@/services/videos";
import {
  blockUserByCode,
  getPublicProfile,
  type PublicUserProfile,
} from "@/services/profile";
import { getUserDisplayName } from "@/utils/user-display-name";
import { getCompanyByUser } from "@/services/company";
import { showReportDialog } from "@/services/report-dialog";
import type { CompanySummary } from "@/types/company";
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
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PROFILE_VIDEO_PAGE_SIZE = 10;
const PROFILE_VIDEO_LOAD_MORE_THRESHOLD = 240;
const PROFILE_VIDEO_SEARCH_DELAY_MS = 350;
const PUBLIC_PROFILE_ORIGIN = "https://etome.eu";

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
  const params = useLocalSearchParams<{ id?: string | string[]; videoId?: string | string[] }>();
  const userId = useMemo(() => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const parsed = rawId ? Number(rawId) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
  }, [params.id]);
  const videoId = useMemo(() => {
    const rawVideoId = Array.isArray(params.videoId) ? params.videoId[0] : params.videoId;
    const parsed = rawVideoId ? Number(rawVideoId) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
  }, [params.videoId]);

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [videosPage, setVideosPage] = useState(0);
  const [hasMoreVideos, setHasMoreVideos] = useState(false);
  const [isLoadingMoreVideos, setIsLoadingMoreVideos] = useState(false);
  const [videoSearch, setVideoSearch] = useState("");
  const [isSearchingVideos, setIsSearchingVideos] = useState(false);
  const [videoCollection, setVideoCollection] = useState<"mine" | "saved">("mine");
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [isLoadingSavedVideos, setIsLoadingSavedVideos] = useState(false);
  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [profileOptionsVisible, setProfileOptionsVisible] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(true);
  const [videoMenuTarget, setVideoMenuTarget] = useState<VideoItem | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(-1);
  const [playbackUrls, setPlaybackUrls] = useState<Record<number, string>>({});
  const [playbackExpiresAt, setPlaybackExpiresAt] = useState<Record<number, number>>({});
  const [isVideoPagerVisible, setIsVideoPagerVisible] = useState(false);
  const [isOpeningVideo, setIsOpeningVideo] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnail, setEditThumbnail] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState<VideoItem | null>(null);
  const autoOpenedVideoIdRef = useRef<number | null>(null);
  const isLoadingMoreVideosRef = useRef(false);
  const isSearchingVideosRef = useRef(false);
  const activeVideoSearchRef = useRef("");
  const videoSearchValueRef = useRef("");
  const videoSearchRequestIdRef = useRef(0);

  const changeVideoSearch = useCallback((value: string) => {
    const normalizedSearch = value.trim();
    const shouldSearch = normalizedSearch !== activeVideoSearchRef.current;
    videoSearchRequestIdRef.current += 1;
    const shouldSearchRemotely = shouldSearch && videoCollection === "mine";
    isSearchingVideosRef.current = shouldSearchRemotely;
    setIsSearchingVideos(shouldSearchRemotely);
    videoSearchValueRef.current = normalizedSearch;
    setVideoSearch(value);
    if (shouldSearchRemotely) {
      setProfile((current) => current ? { ...current, videos: [] } : current);
    }
  }, [videoCollection]);

  useEffect(() => {
    return () => {
      if (callNavigationTimerRef.current) {
        clearTimeout(callNavigationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!Number.isInteger(userId) || profile?.has_paid_subscription !== true) {
      setCompany(null);
      return;
    }

    const controller = new AbortController();
    void getCompanyByUser(userId, controller.signal)
      .then(setCompany)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          console.warn("[PublicProfile] Фирмата не можа да бъде заредена.", error);
        }
      });

    return () => controller.abort();
  }, [profile?.has_paid_subscription, userId]);

  const loadProfile = useCallback(async () => {
    if (!token || !Number.isInteger(userId)) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    videoSearchRequestIdRef.current += 1;
    isSearchingVideosRef.current = false;
    setIsSearchingVideos(false);
    isLoadingMoreVideosRef.current = false;
    setIsLoadingMoreVideos(false);
    try {
      const nextProfile = await getPublicProfile(token, userId, {
        videosPage: 1,
        videosLimit: PROFILE_VIDEO_PAGE_SIZE,
      });
      activeVideoSearchRef.current = "";
      setProfile(nextProfile);
      setVideosPage(nextProfile.videos_pagination?.page ?? 1);
      setHasMoreVideos(nextProfile.videos_pagination?.has_more ?? false);
    } catch (error) {
      setProfile(null);
      setVideosPage(0);
      setHasMoreVideos(false);
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

  useEffect(() => {
    if (!token || !Number.isInteger(userId) || videoCollection !== "mine") return;

    const normalizedSearch = videoSearch.trim();
    if (normalizedSearch === activeVideoSearchRef.current) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const requestId = videoSearchRequestIdRef.current + 1;
      videoSearchRequestIdRef.current = requestId;
      isSearchingVideosRef.current = true;
      setIsSearchingVideos(true);

      void getPublicProfile(token, userId, {
        videosPage: 1,
        videosLimit: PROFILE_VIDEO_PAGE_SIZE,
        videosSearch: normalizedSearch,
        signal: controller.signal,
      })
        .then((response) => {
          if (requestId !== videoSearchRequestIdRef.current) return;
          activeVideoSearchRef.current = normalizedSearch;
          setProfile((current) => current ? {
            ...current,
            videos: response.videos ?? [],
            videos_pagination: response.videos_pagination,
          } : current);
          setVideosPage(response.videos_pagination?.page ?? 1);
          setHasMoreVideos(response.videos_pagination?.has_more ?? false);
        })
        .catch((error) => {
          if (error instanceof Error && error.name === "AbortError") return;
          if (requestId === videoSearchRequestIdRef.current) {
            console.error("[PublicProfile] Търсенето на видеоклипове беше неуспешно.", error);
          }
        })
        .finally(() => {
          if (requestId !== videoSearchRequestIdRef.current) return;
          isSearchingVideosRef.current = false;
          setIsSearchingVideos(false);
        });
    }, PROFILE_VIDEO_SEARCH_DELAY_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [token, userId, videoCollection, videoSearch]);

  useEffect(() => {
    if (!token || !profile?.is_self || videoCollection !== "saved") return;

    let cancelled = false;
    setIsLoadingSavedVideos(true);
    void listSavedVideos(token)
      .then((response) => {
        if (!cancelled) setSavedVideos(response.data);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("[Profile] Запазените видеа не можаха да бъдат заредени.", error);
          setSavedVideos([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSavedVideos(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.is_self, token, videoCollection]);

  const visibleVideos = useMemo(() => {
    if (!profile?.is_self || videoCollection === "mine") return profile?.videos ?? [];
    const terms = videoSearch.trim().toLocaleLowerCase("bg-BG").split(/[\s,]+/u).filter(Boolean);
    if (terms.length === 0) return savedVideos;
    return savedVideos.filter((video) => {
      const searchable = `${video.title} ${video.description ?? ""}`.toLocaleLowerCase("bg-BG");
      return terms.every((term) => searchable.includes(term));
    });
  }, [profile?.is_self, profile?.videos, savedVideos, videoCollection, videoSearch]);

  const loadMoreVideos = useCallback(async () => {
    if (
      !token
      || !profile
      || videoCollection !== "mine"
      || !Number.isInteger(userId)
      || !hasMoreVideos
      || isLoadingMoreVideosRef.current
      || isSearchingVideosRef.current
    ) return;

    const nextPage = videosPage + 1;
    const requestedSearch = activeVideoSearchRef.current;
    isLoadingMoreVideosRef.current = true;
    setIsLoadingMoreVideos(true);
    try {
      const response = await getPublicProfile(token, userId, {
        videosPage: nextPage,
        videosLimit: PROFILE_VIDEO_PAGE_SIZE,
        videosSearch: requestedSearch,
      });
      if (requestedSearch !== videoSearchValueRef.current) return;
      setProfile((current) => {
        if (!current) return current;
        const currentVideos = current.videos ?? [];
        const existingIds = new Set(currentVideos.map((video) => video.id));
        return {
          ...current,
          videos: [
            ...currentVideos,
            ...(response.videos ?? []).filter((video) => !existingIds.has(video.id)),
          ],
          videos_pagination: response.videos_pagination,
        };
      });
      setVideosPage(response.videos_pagination?.page ?? nextPage);
      setHasMoreVideos(response.videos_pagination?.has_more ?? false);
    } catch (error) {
      console.error("[PublicProfile] Още видеоклипове не можаха да бъдат заредени.", error);
    } finally {
      isLoadingMoreVideosRef.current = false;
      setIsLoadingMoreVideos(false);
    }
  }, [hasMoreVideos, profile, token, userId, videoCollection, videosPage]);

  const loadVideoPlayback = useCallback(async (index: number) => {
    const video = visibleVideos[index];
    if (!token || !video || isOpeningVideo || video.status !== "ready") return;
    const cachedUrl = playbackUrls[video.id];
    const expiresAt = playbackExpiresAt[video.id] ?? 0;
    if (cachedUrl && (!expiresAt || expiresAt > Math.floor(Date.now() / 1000) + 30)) return;
    setIsOpeningVideo(true);
    try {
      const playback = await getVideoPlayback(token, video.id);
      setPlaybackUrls((current) => ({ ...current, [video.id]: playback.data.url }));
      setPlaybackExpiresAt((current) => ({ ...current, [video.id]: playback.data.expires_at }));
    } catch (error) {
      console.error("[VideoPlayback] Видеото не можа да бъде отворено.", error);
    } finally {
      setIsOpeningVideo(false);
    }
  }, [isOpeningVideo, playbackExpiresAt, playbackUrls, token, visibleVideos]);

  const openVideo = useCallback(async (video: VideoItem) => {
    if (!token || isOpeningVideo || video.status !== "ready") return;
    const index = visibleVideos.findIndex((item) => item.id === video.id);
    if (index < 0) return;
    setSelectedVideoIndex(index);
    setIsVideoPagerVisible(true);
    await loadVideoPlayback(index);
  }, [isOpeningVideo, loadVideoPlayback, token, visibleVideos]);

  useEffect(() => {
    if (!profile?.videos || !Number.isInteger(videoId) || autoOpenedVideoIdRef.current === videoId) return;

    const requestedVideo = profile.videos.find((video) => video.id === videoId);
    if (!requestedVideo || requestedVideo.status !== "ready") return;

    autoOpenedVideoIdRef.current = videoId;
    void openVideo(requestedVideo);
  }, [openVideo, profile?.videos, videoId]);

  const closeVideo = useCallback(() => {
    setIsVideoPagerVisible(false);
    setSelectedVideoIndex(-1);
  }, []);

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
    return (
      <Redirect
        href={{
          pathname: "/(auth)/login",
          params: Number.isInteger(userId) ? { returnTo: `/user/${userId}` } : {},
        }}
      />
    );
  }

  const displayName = profile
    ? getUserDisplayName(profile)
    : "Потребител";
  const phone = profile?.phone?.trim() ?? "";
  const phoneParts = phone ? phoneDisplayParts(phone) : null;
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

  const shareProfile = async () => {
    if (!profile) return;
    const profileUrl = `${PUBLIC_PROFILE_ORIGIN}/accounts/${profile.id}`;

    try {
      await Share.share({
        title: `Профилът на ${displayName}`,
        message: `Виж профила на ${displayName} в „Ето ме“:\n${profileUrl}`,
        url: profileUrl,
      });
    } catch {
      Alert.alert("Грешка", "Профилът не можа да бъде споделен.");
    }
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

  const openVideoActions = (video: VideoItem) => {
    if (!profile || isSavingVideo) return;
    setVideoMenuTarget(video);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title={profile ? displayName : "Профил"} hideSearchButton hideAuthButton />
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
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(64, insets.bottom + 64) },
          ]}
          onScroll={({ nativeEvent }) => {
            const distanceFromBottom = nativeEvent.contentSize.height
              - nativeEvent.layoutMeasurement.height
              - nativeEvent.contentOffset.y;
            if (distanceFromBottom <= PROFILE_VIDEO_LOAD_MORE_THRESHOLD) {
              void loadMoreVideos();
            }
          }}
          scrollEventThrottle={200}
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
            {!profile.is_self && profile.public_code && !profile.is_blocked_by_me ? (
              <Pressable
                onPress={() => setProfileOptionsVisible(true)}
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
            <View style={styles.profileShareActions}>
              <TouchableOpacity
                onPress={() => void shareProfile()}
                style={[styles.profileShareButton, { backgroundColor: theme.colors.surface }]}
                accessibilityRole="button"
                accessibilityLabel={`Сподели профила на ${displayName}`}
              >
                <FontAwesome name="share-alt" size={14} color={theme.colors.text} />
                <Text style={[styles.profileShareButtonText, { color: theme.colors.text }]}>Сподели профила</Text>
              </TouchableOpacity>
            </View>

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

          <View
            style={[
              styles.aboutCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setIsAboutExpanded((expanded) => !expanded)}
              style={styles.aboutSectionHeader}
              accessibilityRole="button"
              accessibilityState={{ expanded: isAboutExpanded }}
              accessibilityLabel={isAboutExpanded ? "Свий секцията За мен" : "Разгъни секцията За мен"}
            >
              <Text style={[styles.aboutTitle, { color: theme.colors.text }]}>За мен</Text>
              <FontAwesome
                name={isAboutExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            {isAboutExpanded ? <>
            {profile.username ? (
              <AboutRow
                icon="at"
                text={profile.username}
                colors={theme.colors}
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
            ) : null}
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
            </> : null}
          </View>

          {profile.has_paid_subscription && company ? <ProfileBusinessCard company={company} /> : null}

          <VideosSection
            videos={visibleVideos}
            videoStats={profile.video_stats}
            colors={theme.colors}
            onUploadVideo={() => router.push("/videos/upload")}
            onOpenVideo={openVideo}
            isOpeningVideo={isOpeningVideo}
            canManage={profile.is_self && videoCollection === "mine"}
            onMoreVideo={openVideoActions}
            isManaging={isSavingVideo}
            isLoadingMore={isLoadingMoreVideos}
            search={videoSearch}
            onChangeSearch={changeVideoSearch}
            isSearching={videoCollection === "mine" ? isSearchingVideos : isLoadingSavedVideos}
            showCollections={profile.is_self}
            collection={videoCollection}
            onChangeCollection={setVideoCollection}
          />
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
      <ChatMoreOptionsModal
        visible={profileOptionsVisible}
        onClose={() => setProfileOptionsVisible(false)}
        title="Опции за профила"
        subtitle={displayName}
        options={profile && !profile.is_self ? [
          {
            icon: "flag",
            label: "Докладвай потребителя",
            destructive: true,
            onPress: () => token && showReportDialog(token, "user", profile.id),
          },
          {
            icon: "ban",
            label: "Блокирай потребителя",
            destructive: true,
            onPress: () => setConfirmBlock(true),
          },
        ] : []}
        colors={theme.colors}
      />
      <ConfirmModal
        visible={Boolean(deletingVideo)}
        title="Изтриване на видео"
        message={`Видеото „${deletingVideo?.title ?? ""}“ ще бъде изтрито от профила. Това действие не може да бъде отменено.`}
        confirmText="Изтрий видеото"
        destructive
        onConfirm={() => void confirmDeleteVideo()}
        onCancel={() => setDeletingVideo(null)}
      />
      <ChatMoreOptionsModal
        visible={Boolean(videoMenuTarget && profile?.is_self)}
        onClose={() => setVideoMenuTarget(null)}
        title="Опции за видеото"
        subtitle={videoMenuTarget?.title ?? "Изберете действие."}
        options={videoMenuTarget && profile?.is_self ? [
          {
            icon: "pencil",
            label: "Редактирай",
            onPress: () => startEditingVideo(videoMenuTarget),
          },
          {
            icon: "trash",
            label: "Изтрий",
            destructive: true,
            onPress: () => setDeletingVideo(videoMenuTarget),
          },
        ] : []}
        colors={theme.colors}
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
      <ProfileVideoPager
        visible={isVideoPagerVisible}
        videos={visibleVideos}
        initialIndex={selectedVideoIndex}
        playbackUrls={playbackUrls}
        onRequestPlayback={(index) => {
          setSelectedVideoIndex(index);
          void loadVideoPlayback(index);
        }}
        onClose={closeVideo}
        onViewVideo={(videoId) => {
          if (!token) return;
          void recordVideoView(token, videoId)
            .then(({ data }) => {
              setProfile((current) => current ? {
                ...current,
                videos: (current.videos ?? []).map((video) => (
                  video.id === videoId
                    ? { ...video, total_views: data.total_views, unique_viewers: data.unique_viewers }
                    : video
                )),
              } : current);
              setSavedVideos((current) => current.map((video) => (
                video.id === videoId
                  ? { ...video, total_views: data.total_views, unique_viewers: data.unique_viewers }
                  : video
              )));
            })
            .catch((error) => {
              console.warn("[Profile] Гледането не можа да бъде отчетено.", { videoId, error });
            });
        }}
        colors={theme.colors}
        token={token}
      />
    </View>
  );
}

function VideosSection({
  videos,
  videoStats,
  colors,
  onUploadVideo,
  onOpenVideo,
  isOpeningVideo,
  canManage,
  onMoreVideo,
  isManaging,
  isLoadingMore,
  search,
  onChangeSearch,
  isSearching,
  showCollections,
  collection,
  onChangeCollection,
}: {
  videos: VideoItem[];
  videoStats?: PublicUserProfile["video_stats"];
  colors: { card: string; border: string; text: string; textSecondary: string; surface: string; icon: string; primary: string; buttonText: string };
  onUploadVideo: () => void;
  onOpenVideo: (video: VideoItem) => void;
  isOpeningVideo: boolean;
  canManage: boolean;
  onMoreVideo: (video: VideoItem) => void;
  isManaging: boolean;
  isLoadingMore: boolean;
  search: string;
  onChangeSearch: (value: string) => void;
  isSearching: boolean;
  showCollections: boolean;
  collection: "mine" | "saved";
  onChangeCollection: (collection: "mine" | "saved") => void;
}) {
  const hasSearch = search.trim().length > 0;
  const videoResults = (
    <>
      {videos.length === 0 ? (
        <Text style={[styles.emptyVideos, { color: colors.textSecondary }]}>
          {isSearching
            ? "Търсене на видеоклипове…"
            : hasSearch
            ? "Няма видеоклипове, които съвпадат с търсенето."
            : collection === "saved"
            ? "Все още нямате запазени видеоклипове."
            : "Този потребител все още няма видеоклипове."}
        </Text>
      ) : (
        <>
          <View style={styles.videoGrid}>
            {videos.map((video) => (
              <View key={video.id} style={[styles.videoGridItem, video.status !== "ready" && styles.processingVideoItem]}>
                <Pressable
                  onPress={() => onOpenVideo(video)}
                  disabled={isOpeningVideo || video.status !== "ready"}
                  style={styles.videoGridThumbnailWrap}
                  accessibilityRole="button"
                  accessibilityLabel={video.status !== "ready" ? `${video.title} — обработва се` : "Пусни " + video.title}
                >
                  {video.thumbnail_url ? (
                    <RemoteImage uri={video.thumbnail_url} style={styles.videoGridThumbnail} />
                  ) : (
                    <View style={[styles.videoGridThumbnail, styles.videoPlaceholder, { backgroundColor: colors.surface }]}>
                      <FontAwesome name="video-camera" size={26} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.videoGridViews} pointerEvents="none">
                    <FontAwesome name="eye" size={10} color="#ffffff" />
                    <Text style={styles.videoGridViewsText}>{Math.max(0, video.total_views).toLocaleString("bg-BG")}</Text>
                  </View>
                  {canManage ? (
                    <TouchableOpacity
                      onPress={() => onMoreVideo(video)}
                      disabled={isManaging}
                      style={styles.videoGridMoreButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Още действия за ${video.title}`}
                    >
                      <FontAwesome name="ellipsis-h" size={13} color="#ffffff" />
                    </TouchableOpacity>
                  ) : null}
                </Pressable>
                {getVideoDisplayTitle(video) ? (
                  <Text style={[styles.videoGridTitle, { color: colors.text }]} numberOfLines={2}>
                    {getVideoDisplayTitle(video)}
                  </Text>
                ) : null}
                {video.status !== "ready" ? (
                  <Text style={[styles.videoGridStatus, { color: colors.textSecondary }]} numberOfLines={1}>Обработва се…</Text>
                ) : null}
              </View>
            ))}
          </View>
        </>
      )}
      {isLoadingMore ? (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.loadingMoreVideos}
        />
      ) : null}
    </>
  );

  return (
    <View style={styles.videosCard}>
      <View style={styles.videoHeader}>
        <Text style={[styles.aboutTitle, { color: colors.text }]}>Видеоклипове</Text>
        {canManage ? (
          <View style={styles.videoHeaderActions}>
            <TouchableOpacity
              onPress={onUploadVideo}
              style={[styles.uploadVideoButton, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Качи видео"
            >
              <FontAwesome name="plus" size={13} color={colors.buttonText} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      <View
        style={[
          styles.videoSearch,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <FontAwesome name="search" size={15} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={onChangeSearch}
          placeholder="Търсене по заглавие или ключова дума"
          placeholderTextColor={colors.textSecondary}
          style={[styles.videoSearchInput, { color: colors.text }]}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Търсене във видеоклиповете"
        />
        {isSearching ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : hasSearch ? (
          <TouchableOpacity
            onPress={() => onChangeSearch("")}
            style={styles.clearVideoSearch}
            accessibilityRole="button"
            accessibilityLabel="Изчисти търсенето"
          >
            <FontAwesome name="times-circle" size={17} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {videoStats ? <VideoStatsCard stats={videoStats} colors={colors} /> : null}
      {showCollections ? (
        <View style={styles.videoCollectionTabs}>
          <TouchableOpacity
            onPress={() => onChangeCollection("mine")}
            style={[
              styles.videoCollectionTab,
              collection === "mine"
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: collection === "mine" }}
          >
            <FontAwesome name="video-camera" size={14} color={collection === "mine" ? colors.buttonText : colors.text} />
            <Text style={[styles.videoCollectionTabText, { color: collection === "mine" ? colors.buttonText : colors.text }]}>Моите видеа</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onChangeCollection("saved")}
            style={[
              styles.videoCollectionTab,
              collection === "saved"
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: collection === "saved" }}
          >
            <FontAwesome name="bookmark-o" size={15} color={collection === "saved" ? colors.buttonText : colors.text} />
            <Text style={[styles.videoCollectionTabText, { color: collection === "saved" ? colors.buttonText : colors.text }]}>Запазени</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {videoResults}
    </View>
  );
}

function VideoStatsCard({
  stats,
  colors,
}: {
  stats: NonNullable<PublicUserProfile["video_stats"]>;
  colors: { card: string; border: string; text: string; textSecondary: string; icon: string };
}) {
  return (
    <View style={[styles.videoStatsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.videoStatsHeading}>
        <FontAwesome name="bar-chart" size={14} color={colors.icon} />
        <Text style={[styles.videoStatsTitle, { color: colors.text }]}>Статистика</Text>
      </View>
      <View style={styles.videoStatsValues}>
        <VideoStat value={stats.video_count} label="Видеа" colors={colors} />
        <VideoStat value={stats.total_views} label="Гледания" colors={colors} />
        <VideoStat value={stats.unique_viewers} label="Зрители" colors={colors} />
      </View>
    </View>
  );
}

function VideoStat({
  value,
  label,
  colors,
}: {
  value: number;
  label: string;
  colors: { text: string; textSecondary: string };
}) {
  return (
    <View style={styles.videoStat}>
      <Text style={[styles.videoStatValue, { color: colors.text }]}>{Math.max(0, value).toLocaleString("bg-BG")}</Text>
      <Text style={[styles.videoStatLabel, { color: colors.textSecondary }]}>{label}</Text>
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
  profileShareActions: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  profileShareButton: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  profileShareButtonText: {
    fontSize: 13,
    fontWeight: "700",
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
  aboutSectionHeader: { minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  aboutRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  aboutIcon: { width: 18, marginTop: 2, textAlign: "center" },
  aboutText: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: "500" },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  videosCard: { marginTop: 14, marginHorizontal: 16, gap: 12 },
  videoStatsCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  videoStatsHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  videoStatsTitle: { fontSize: 14, fontWeight: "800" },
  videoStatsValues: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  videoStat: { flex: 1, gap: 2 },
  videoStatValue: { fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
  videoStatLabel: { fontSize: 12, fontWeight: "600" },
  videoHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  videoHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadVideoButton: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  videoSearch: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9 },
  videoSearchInput: { flex: 1, minHeight: 44, fontSize: 14, paddingVertical: 0 },
  clearVideoSearch: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  emptyVideos: { fontSize: 14, lineHeight: 20 },
  videoCollectionTabs: { flexDirection: "row", gap: 8 },
  videoCollectionTab: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  videoCollectionTabText: { fontSize: 14, fontWeight: "800" },
  videoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  videoGridItem: { width: "31.7%", gap: 5 },
  videoGridThumbnailWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: 0.76,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#111111",
  },
  videoGridThumbnail: { width: "100%", height: "100%" },
  videoGridViews: {
    position: "absolute",
    left: 6,
    bottom: 6,
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  videoGridViewsText: { color: "#ffffff", fontSize: 10, fontWeight: "800" },
  videoGridMoreButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  videoGridTitle: { fontSize: 12, lineHeight: 15, fontWeight: "800" },
  videoGridStatus: { fontSize: 10, lineHeight: 13, fontWeight: "700" },
  videoItem: { position: "relative", flexDirection: "row", gap: 12, paddingTop: 12, borderTopWidth: 1 },
  processingVideoItem: { opacity: 0.72 },
  videoThumbnailWrap: { position: "relative", width: 112, height: 72 },
  videoThumbnail: { width: "100%", height: "100%", borderRadius: 10 },
  videoPlaceholder: { alignItems: "center", justifyContent: "center" },
  videoDetails: { flex: 1, gap: 5, justifyContent: "center", paddingRight: 28 },
  videoTitleRow: { flexDirection: "row", alignItems: "center" },
  videoMoreButton: { position: "absolute", top: 10, right: 0, width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.55)", backgroundColor: "rgba(148, 163, 184, 0.12)", alignItems: "center", justifyContent: "center" },
  videoTitle: { fontSize: 15, fontWeight: "800", lineHeight: 20 },
  videoDescription: { fontSize: 13, lineHeight: 18 },
  videoStatus: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  videoActionText: { fontSize: 12, fontWeight: "800" },
  loadingMoreVideos: { marginTop: 4, marginBottom: 24 },
});
