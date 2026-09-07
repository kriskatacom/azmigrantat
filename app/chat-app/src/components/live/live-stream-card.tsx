import { useAppTheme } from "@/app/_layout";
import RemoteImage from "@/components/ui/RemoteImage";
import type { LiveStream } from "@/types/live";
import { toPublicFileUrl } from "@/utils/public-file-url";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function formatDuration(startedAt: string | null): string {
  if (!startedAt) {
    return "Току-що";
  }

  const elapsed = Date.now() - Date.parse(startedAt);

  if (!Number.isFinite(elapsed) || elapsed < 0) {
    return "Току-що";
  }

  const minutes = Math.floor(elapsed / 60_000);
  const hours = Math.floor(minutes / 60);

  if (hours >= 1) {
    return `${hours} ч ${minutes % 60} мин`;
  }

  if (minutes < 1) {
    return "Току-що";
  }

  return `${minutes} мин`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export default function LiveStreamCard({
  stream,
  onPress,
}: {
  stream: LiveStream;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const ownerName = stream.owner?.name ?? "Стриймър";
  const title = stream.title?.trim() || `${ownerName} е на живо`;
  const avatar = toPublicFileUrl(stream.owner?.profile_image) ?? stream.owner?.profile_image ?? null;
  const cover =
    toPublicFileUrl(stream.cover_image) ??
    stream.cover_image ??
    toPublicFileUrl(stream.owner?.cover_image) ??
    stream.owner?.cover_image ??
    null;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.card }]}
    >
      <View style={styles.preview}>
        {cover ? (
          <RemoteImage uri={cover} style={styles.previewImage} contentFit="cover" />
        ) : (
          <View style={[styles.previewFallback, { backgroundColor: "#111827" }]}>
            <Text style={styles.previewInitials}>{initials(ownerName)}</Text>
          </View>
        )}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>НА ЖИВО</Text>
        </View>
        <View style={styles.viewerBadge}>
          <Ionicons name="eye" size={13} color="#ffffff" />
          <Text style={styles.viewerText}>{stream.viewer_count}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {avatar ? (
          <RemoteImage uri={avatar} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarLetter}>{initials(ownerName)}</Text>
          </View>
        )}
        <View style={styles.meta}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.owner, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {ownerName}
            {stream.owner?.public_code ? ` · ${stream.owner.public_code}` : ""}
          </Text>
          <View style={styles.stats}>
            <FontAwesome name="clock-o" size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.stat, { color: theme.colors.textSecondary }]}>
              {formatDuration(stream.started_at)}
            </Text>
            {stream.is_owner ? (
              <View style={[styles.mine, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.mineText}>Твоето предаване</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
  },
  preview: {
    height: 148,
    width: "100%",
    backgroundColor: "#0b1220",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 148,
  },
  previewFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  previewInitials: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 52,
    fontWeight: "800",
  },
  liveBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#dc2626",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  liveLabel: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  viewerBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(8, 12, 24, 0.78)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewerText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  owner: {
    marginTop: 3,
    fontSize: 13,
  },
  stats: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stat: {
    fontSize: 12,
    fontWeight: "600",
  },
  mine: {
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mineText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
});
