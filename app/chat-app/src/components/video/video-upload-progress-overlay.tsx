import { useAppTheme } from "@/app/_layout";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export type VideoUploadStage = "preparing" | "uploading" | "processing";

type Props = {
  visible: boolean;
  progress: number;
  stage: VideoUploadStage;
  elapsedSeconds: number;
  remainingSeconds: number | null;
  onContinueInBackground?: () => void;
};

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function ProgressRing({
  progress,
  color,
  trackColor,
  textColor,
  secondaryTextColor,
}: {
  progress: number;
  color: string;
  trackColor: string;
  textColor: string;
  secondaryTextColor: string;
}) {
  const value = Math.max(0, Math.min(100, progress));
  const size = 230;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <View style={styles.ring}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.percent, { color: textColor }]}>{Math.round(value)}%</Text>
        <Text style={[styles.percentCaption, { color: secondaryTextColor }]}>готово</Text>
      </View>
    </View>
  );
}

const stageContent: Record<VideoUploadStage, { title: string; description: string }> = {
  preparing: {
    title: "Подготовка",
    description: "Подготвяме видеото за сигурно качване…",
  },
  uploading: {
    title: "Качване на видеото",
    description: "Видеото се качва. Не затваряйте приложението, докато процесът не приключи.",
  },
  processing: {
    title: "Обработване на видеото",
    description: "Качването завърши. Видеото се обработва и ще бъде достъпно за гледане, когато обработката приключи.",
  },
};

export default function VideoUploadProgressOverlay({
  visible,
  progress,
  stage,
  elapsedSeconds,
  remainingSeconds,
  onContinueInBackground,
}: Props) {
  const { theme } = useAppTheme();
  const content = stageContent[stage];
  const displayProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ProgressRing
          progress={displayProgress}
          color={theme.colors.primary}
          trackColor={theme.colors.inputBorder}
          textColor={theme.colors.text}
          secondaryTextColor={theme.colors.textSecondary}
        />

        <View style={styles.titleRow}>
          {stage === "processing" ? <ActivityIndicator color={theme.colors.primary} size="small" /> : null}
          <Text style={[styles.title, { color: theme.colors.text }]}>{content.title}</Text>
        </View>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{content.description}</Text>

        <View style={styles.details}>
          <View style={styles.detail}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Изминало време</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{formatDuration(elapsedSeconds)}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Оставащо време</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {stage === "processing" || remainingSeconds === null ? "Изчислява се" : formatDuration(remainingSeconds)}
            </Text>
          </View>
        </View>

        <View style={styles.stages}>
          {(["preparing", "uploading", "processing"] as VideoUploadStage[]).map((item) => {
            const active = item === stage;
            const complete = item === "preparing" && stage !== "preparing" || item === "uploading" && stage === "processing";
            return (
              <View key={item} style={styles.stageRow}>
                <View style={[styles.stageDot, { backgroundColor: active || complete ? theme.colors.primary : theme.colors.inputBorder }]} />
                <Text style={[styles.stageText, { color: active || complete ? theme.colors.text : theme.colors.textSecondary }]}>
                  {stageContent[item].title}
                </Text>
              </View>
            );
          })}
        </View>
        {onContinueInBackground ? (
          <TouchableOpacity
            onPress={onContinueInBackground}
            style={[styles.backgroundButton, { borderColor: theme.colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Продължи качването във фонов режим"
          >
            <Text style={[styles.backgroundButtonText, { color: theme.colors.text }]}>Продължи в приложението</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  ring: { width: 230, height: 230, borderRadius: 115, alignItems: "center", justifyContent: "center", shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  ringCenter: { position: "absolute", width: 190, height: 190, borderRadius: 95, alignItems: "center", justifyContent: "center" },
  percent: { fontSize: 42, fontWeight: "800" },
  percentCaption: { fontSize: 14, marginTop: 2 },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center", marginTop: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 34 },
  description: { fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 360, marginTop: 12 },
  details: { flexDirection: "row", gap: 34, marginTop: 32 },
  detail: { alignItems: "center", minWidth: 120 },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 20, fontWeight: "700", marginTop: 5 },
  stages: { alignSelf: "stretch", maxWidth: 360, gap: 15, marginTop: 38 },
  stageRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stageDot: { width: 12, height: 12, borderRadius: 6 },
  stageText: { fontSize: 15, fontWeight: "600" },
  backgroundButton: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", marginTop: 28 },
  backgroundButtonText: { fontSize: 14, fontWeight: "700" },
});
