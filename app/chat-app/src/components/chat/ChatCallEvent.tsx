import { FontAwesome } from "@expo/vector-icons";
import { useUserSettings } from "@/hooks/useUserSettings";
import type { ChatMessage } from "@/types/chat";
import { formatMessageTime } from "@/utils/chat/formatMessageTime";
import { StyleSheet, Text, View } from "react-native";

export type CallEventOutcome =
  | "completed"
  | "missed"
  | "rejected"
  | "cancelled"
  | "unanswered";

export type CallEventDetails = {
  callId: string;
  callType: "audio" | "video";
  outcome: CallEventOutcome;
  callerId: number;
  callerName: string;
  recipientId: number;
  recipientName: string;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  endedById: number | null;
  endedByName: string | null;
  reason: string | null;
  cameraEnabled: boolean;
};

const OUTCOMES: CallEventOutcome[] = [
  "completed",
  "missed",
  "rejected",
  "cancelled",
  "unanswered",
];

export function parseCallEvent(message: ChatMessage): CallEventDetails | null {
  if (message.type !== "system") {
    return null;
  }

  const metadata = message.metadata;
  if (!metadata || metadata.kind !== "call") {
    return null;
  }

  const callType = metadata.call_type === "audio" ? "audio" : "video";
  const outcome = OUTCOMES.includes(metadata.outcome as CallEventOutcome)
    ? (metadata.outcome as CallEventOutcome)
    : "missed";

  return {
    callId: String(metadata.call_id ?? message.client_message_id ?? ""),
    callType,
    outcome,
    callerId: Number(metadata.caller_id ?? message.sender_id),
    callerName: String(metadata.caller_name ?? message.sender?.name ?? "Потребител"),
    recipientId: Number(metadata.recipient_id ?? 0),
    recipientName: String(metadata.recipient_name ?? "Потребител"),
    startedAt: typeof metadata.started_at === "string" ? metadata.started_at : message.created_at,
    answeredAt: typeof metadata.answered_at === "string" ? metadata.answered_at : null,
    endedAt: typeof metadata.ended_at === "string" ? metadata.ended_at : message.created_at,
    durationSeconds: Number(metadata.duration_seconds ?? 0),
    endedById:
      metadata.ended_by_id == null || metadata.ended_by_id === ""
        ? null
        : Number(metadata.ended_by_id),
    endedByName:
      typeof metadata.ended_by_name === "string" ? metadata.ended_by_name : null,
    reason: typeof metadata.reason === "string" ? metadata.reason : null,
    cameraEnabled: metadata.camera_enabled === true || callType === "video",
  };
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const date = parsed.toLocaleDateString("bg-BG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `${date}, ${formatMessageTime(value)}`;
}

function outcomeLabel(outcome: CallEventOutcome, isVideo: boolean): string {
  const kind = isVideo ? "видео обаждане" : "аудио обаждане";

  switch (outcome) {
    case "completed":
      return isVideo ? "Видео обаждане" : "Аудио обаждане";
    case "rejected":
      return `Отхвърлено ${kind}`;
    case "cancelled":
      return `Отменено ${kind}`;
    case "unanswered":
      return `${isVideo ? "Видео" : "Аудио"} обаждане без отговор`;
    default:
      return `Пропуснато ${kind}`;
  }
}

function displayName(name: string, userId: number, currentUserId?: number): string {
  if (currentUserId != null && Number(userId) === Number(currentUserId)) {
    return "ти";
  }

  return name;
}

type ChatCallEventProps = {
  event: CallEventDetails;
  currentUserId?: number | string;
  colors: {
    card: string;
    border: string;
    text: string;
    textSecondary: string;
    primary: string;
  };
};

export default function ChatCallEvent({
  event,
  currentUserId,
  colors,
}: ChatCallEventProps) {
  const { showFullCallDetails } = useUserSettings();
  const currentId = currentUserId == null ? undefined : Number(currentUserId);
  const isVideo = event.callType === "video";
  const title = outcomeLabel(event.outcome, isVideo);
  const accent =
    event.outcome === "completed"
      ? "#16a34a"
      : event.outcome === "missed" || event.outcome === "rejected"
        ? "#dc2626"
        : colors.textSecondary;

  const caller = displayName(event.callerName, event.callerId, currentId);
  const recipient = displayName(event.recipientName, event.recipientId, currentId);
  const endedBy =
    event.endedById != null
      ? displayName(event.endedByName ?? "Потребител", event.endedById, currentId)
      : null;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.header,
            !showFullCallDetails && styles.headerCompact,
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
            <FontAwesome
              name={isVideo ? "video-camera" : "phone"}
              size={16}
              color={accent}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {event.startedAt ? (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {formatDateTime(event.startedAt)}
              </Text>
            ) : null}
          </View>
        </View>

        {showFullCallDetails ? (
        <View style={styles.details}>
          <Detail
            label="Обадил се"
            value={caller}
            colors={colors}
          />
          <Detail
            label="Приемащ"
            value={recipient}
            colors={colors}
          />
          {event.outcome === "completed" ? (
            <Detail
              label="Продължителност"
              value={formatDuration(event.durationSeconds)}
              colors={colors}
            />
          ) : null}
          {event.answeredAt ? (
            <Detail
              label="Прието в"
              value={formatMessageTime(event.answeredAt)}
              colors={colors}
            />
          ) : null}
          {event.endedAt ? (
            <Detail
              label="Приключило в"
              value={formatMessageTime(event.endedAt)}
              colors={colors}
            />
          ) : null}
          {endedBy ? (
            <Detail
              label="Приключил"
              value={endedBy}
              colors={colors}
            />
          ) : null}
          <Detail
            label="Камера"
            value={event.cameraEnabled ? "включена" : "изключена"}
            colors={colors}
          />
        </View>
        ) : null}
      </View>
    </View>
  );
}

function Detail({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string; textSecondary: string };
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  card: {
    width: "92%",
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  headerCompact: {
    marginBottom: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
});
