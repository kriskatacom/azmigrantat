import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import AppButton from "@/components/ui/AppButton";
import { useVideoVolume } from "@/contexts/VideoVolumeContext";
import { useAuth } from "@/hooks/useAuth";
import {
  cancelVideoEnhancement,
  getVideoEnhancementOptions,
  getVideoEnhancementStatus,
  getVideoPlayback,
  selectVideoEnhancementVersion,
  startVideoEnhancement,
} from "@/services/videos";
import type { VideoEnhancementJob, VideoEnhancementMethod, VideoEnhancementModeOption } from "@/types/video";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { activateVideoVolumeButtons } from "../../../../modules/video-volume-buttons";

function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")} мин.`;
}

function VideoComparison({ originalUrl, enhancedUrl }: { originalUrl: string; enhancedUrl: string }) {
  const { theme } = useAppTheme();
  const { volume: videoVolume } = useVideoVolume();
  const [version, setVersion] = useState<"original" | "enhanced">("enhanced");
  const player = useVideoPlayer(null);
  const activeUrl = version === "enhanced" ? enhancedUrl : originalUrl;
  useEffect(() => {
    player.pause();
    void player.replaceAsync(activeUrl);
  }, [activeUrl, player]);
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- expo-video uses imperative player properties. */
    player.volume = videoVolume;
    player.muted = videoVolume <= 0;
    /* eslint-enable react-hooks/immutability */
  }, [player, videoVolume]);
  useEffect(() => activateVideoVolumeButtons(), []);
  return (
    <View style={styles.comparison}>
      <View style={styles.segmentRow}>
        {(["original", "enhanced"] as const).map((item) => (
          <Pressable key={item} onPress={() => setVersion(item)} style={[styles.segment, { borderColor: theme.colors.primary, backgroundColor: version === item ? theme.colors.primary : theme.colors.card }]}>
            <Text style={{ color: version === item ? "#fff" : theme.colors.text, fontWeight: "700" }}>{item === "original" ? "Оригинал" : "Подобрено"}</Text>
          </Pressable>
        ))}
      </View>
      <VideoView player={player} style={styles.video} nativeControls fullscreenOptions={{ enable: true }} />
    </View>
  );
}

export default function EnhanceVideoScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    jobId?: string | string[];
    method?: string | string[];
  }>();
  const videoId = useMemo(() => Number(Array.isArray(params.id) ? params.id[0] : params.id), [params.id]);
  const initialJobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  const preferredMethod = useMemo<VideoEnhancementMethod | null>(() => {
    const value = Array.isArray(params.method) ? params.method[0] : params.method;
    return value === "standard" || value === "ai" ? value : null;
  }, [params.method]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [input, setInput] = useState<{ duration: number; width: number; height: number } | null>(null);
  const [combinations, setCombinations] = useState<VideoEnhancementModeOption[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<VideoEnhancementMethod>("standard");
  const [selectedOption, setSelectedOption] = useState<VideoEnhancementModeOption | null>(null);
  const [job, setJob] = useState<VideoEnhancementJob | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !Number.isInteger(videoId) || videoId < 1) return;
    let active = true;
    void Promise.all([
      getVideoEnhancementOptions(token, videoId),
      getVideoPlayback(token, videoId),
      initialJobId ? getVideoEnhancementStatus(token, videoId, initialJobId) : Promise.resolve(null),
    ]).then(([options, playback, status]) => {
      if (!active) return;
      setEnabled(options.data.enabled);
      setInput(options.data.input);
      const canonical = (options.data.combinations ?? options.data.modes).map((option) => ({
        ...option,
        method: option.method ?? (option.mode.startsWith("ai_") ? "ai" : "standard"),
        target_short_side: option.target_short_side ?? option.target_height,
      }));
      setCombinations(canonical);
      const first = (preferredMethod
        ? canonical.find((option) => option.available && option.method === preferredMethod)
        : null)
        ?? canonical.find((option) => option.available && option.method === "standard")
        ?? canonical.find((option) => option.available)
        ?? null;
      setSelectedMethod(first?.method ?? "standard");
      setSelectedOption(first);
      const restoredJob = status?.data ?? options.data.latest_job ?? null;
      setOriginalUrl(restoredJob?.original_url || playback.data.url);
      if (restoredJob) setJob(restoredJob);
    }).catch((error) => {
      if (active) Alert.alert("Подобряването не е налично", error instanceof Error ? error.message : "Опитайте отново по-късно.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialJobId, preferredMethod, token, videoId]);

  useEffect(() => {
    if (!token || !job || !["pending", "processing"].includes(job.status)) return;
    let active = true;
    const poll = async () => {
      try { const response = await getVideoEnhancementStatus(token, videoId, job.job_id); if (active) setJob(response.data); }
      catch (error) { console.warn("[VideoEnhancement] status poll failed", error); }
    };
    const timer = setInterval(() => void poll(), 2000);
    return () => { active = false; clearInterval(timer); };
  }, [job?.job_id, job?.status, token, videoId]);

  async function start() {
    if (!token || !selectedOption?.method || !selectedOption.target_short_side || busy) return;
    setBusy(true);
    try {
      const response = await startVideoEnhancement(token, videoId, selectedOption.method, selectedOption.target_short_side, selectedOption.mode, Crypto.randomUUID());
      setJob(response.data);
      setOriginalUrl((current) => response.data.original_url || current);
    } catch (error) { Alert.alert("Задачата не беше стартирана", error instanceof Error ? error.message : "Опитайте отново."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (!token || !job || busy) return;
    setBusy(true);
    try { setJob((await cancelVideoEnhancement(token, videoId, job.job_id)).data); }
    catch (error) { Alert.alert("Отмяната не успя", error instanceof Error ? error.message : "Опитайте отново."); }
    finally { setBusy(false); }
  }

  async function selectVersion(version: "original" | "enhanced") {
    if (!token || !job || busy) return;
    setBusy(true);
    try {
      await selectVideoEnhancementVersion(token, videoId, job.job_id, version);
      Alert.alert("Готово", version === "enhanced" ? "Подобрената версия ще се използва за публикуване." : "Оригиналната версия отново е избрана.");
    } catch (error) { Alert.alert("Версията не беше избрана", error instanceof Error ? error.message : "Опитайте отново."); }
    finally { setBusy(false); }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title="Подобри видеото" hideSearchButton />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View> : (
        <ScrollView contentContainerStyle={styles.content}>
          {!enabled ? <View style={[styles.card, { backgroundColor: theme.colors.card }]}><Text style={[styles.title, { color: theme.colors.text }]}>Функцията не е активна</Text><Text style={{ color: theme.colors.textSecondary }}>Подобряването е ограничено до тестови акаунти, докато сървърният benchmark приключи.</Text></View> : null}
          {input ? <View style={[styles.card, { backgroundColor: theme.colors.card }]}><Text style={[styles.title, { color: theme.colors.text }]}>Оригинално видео</Text><Text style={{ color: theme.colors.textSecondary }}>{input.width} × {input.height} • {formatDuration(input.duration)}</Text></View> : null}
          {!job && enabled ? <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Метод за подобряване</Text>
            <View style={styles.segmentRow}>
              {(["standard", "ai"] as const)
                .filter((method) => combinations.some((option) => option.method === method))
                .map((method) => {
                  const firstAvailable = combinations.find((option) => option.available && option.method === method) ?? null;
                  return (
                    <Pressable
                      key={method}
                      disabled={!firstAvailable}
                      onPress={() => { setSelectedMethod(method); setSelectedOption(firstAvailable); }}
                      style={[
                        styles.segment,
                        !firstAvailable && styles.disabledSegment,
                        { borderColor: theme.colors.primary, backgroundColor: selectedMethod === method ? theme.colors.primary : theme.colors.card },
                      ]}
                    >
                      <Text style={{ color: selectedMethod === method ? "#fff" : theme.colors.text, fontWeight: "700" }}>{method === "standard" ? "Стандартно" : "AI подобряване"}</Text>
                    </Pressable>
                  );
                })}
            </View>
            {combinations.some((option) => option.method === "ai") && !combinations.some((option) => option.available && option.method === "ai") ? (
              <Text style={[styles.note, { color: theme.colors.textSecondary }]}>AI режимът временно не е готов: {combinations.find((option) => option.method === "ai")?.reason || "сървърната readiness проверка не е успешна"}.</Text>
            ) : null}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Резолюция</Text>
            {combinations.filter((option) => option.available && option.method === selectedMethod).map((option) => <Pressable key={option.mode} onPress={() => setSelectedOption(option)} style={[styles.mode, { backgroundColor: theme.colors.card, borderColor: selectedOption?.mode === option.mode ? theme.colors.primary : theme.colors.border }]}> 
              <View style={styles.modeHeader}><Text style={[styles.modeTitle, { color: theme.colors.text }]}>{option.target_short_side ?? option.target_height}p</Text><Text style={{ color: theme.colors.textSecondary }}>{option.estimated_seconds !== null ? `≈ ${formatDuration(option.estimated_seconds)}` : "Недостъпно"}</Text></View>
              <Text style={{ color: theme.colors.textSecondary }}>Видео до {option.max_duration_seconds} сек. • {selectedMethod === "ai" ? "AI възстановяване" : "Бърза FFmpeg обработка"}</Text>
            </Pressable>)}
            <AppButton title="Започни подобряването" loading={busy} disabled={!selectedOption} onPress={() => void start()} />
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>Оригиналът се запазва. Няма автоматичен fallback към друг режим.</Text>
          </> : null}
          {job && ["pending", "processing"].includes(job.status) ? <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{job.status === "pending" ? "Изчаква обработка" : "Видеото се подобрява"}</Text>
            <View style={[styles.track, { backgroundColor: theme.colors.border }]}><View style={[styles.fill, { width: `${job.progress}%`, backgroundColor: theme.colors.primary }]} /></View>
            <Text style={{ color: theme.colors.textSecondary }}>{job.progress}% • Можете да напуснете екрана и да се върнете по-късно.</Text>
            <AppButton title="Отмени задачата" loading={busy} onPress={() => void cancel()} />
          </View> : null}
          {job?.status === "completed" && job.result_url && (job.original_url || originalUrl) ? <>
            <VideoComparison originalUrl={job.original_url || originalUrl!} enhancedUrl={job.result_url} />
            <AppButton title="Използвай подобрената версия" loading={busy} onPress={() => void selectVersion("enhanced")} />
            <Pressable onPress={() => void selectVersion("original")} disabled={busy} style={styles.secondaryButton}><Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Запази оригиналната версия за публикуване</Text></Pressable>
          </> : null}
          {job && ["failed", "cancelled", "timeout"].includes(job.status) ? <View style={[styles.card, { backgroundColor: theme.colors.card }]}><Text style={[styles.title, { color: theme.colors.text }]}>{job.status === "cancelled" ? "Задачата е отменена" : job.status === "timeout" ? "Времето за обработка изтече" : "Обработката не успя"}</Text><Text style={{ color: theme.colors.textSecondary }}>{job.failure_reason || "Оригиналното видео е запазено и може да се използва."}</Text><AppButton title="Избери режим и опитай отново" onPress={() => setJob(null)} /></View> : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 16, gap: 10 }, title: { fontSize: 18, fontWeight: "800" }, sectionTitle: { fontSize: 19, fontWeight: "800" },
  mode: { borderWidth: 2, borderRadius: 16, padding: 15, gap: 8 }, modeHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, modeTitle: { flex: 1, fontSize: 16, fontWeight: "800" }, note: { fontSize: 13, lineHeight: 18, textAlign: "center" },
  track: { height: 10, borderRadius: 5, overflow: "hidden" }, fill: { height: "100%", borderRadius: 5 }, comparison: { gap: 12 }, segmentRow: { flexDirection: "row", gap: 8 }, segment: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" }, disabledSegment: { opacity: 0.45 },
  video: { width: "100%", aspectRatio: 9 / 16, borderRadius: 16, backgroundColor: "#000" }, secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center" },
});
