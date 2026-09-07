import type { LiveReactionEvent } from "@/hooks/live/useLiveRoom";
import { LIVE_REACTION_TYPES } from "@/types/live";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

const CHIP_VISIBLE_MS = 5_000;
const CHIP_FADE_MS = 420;

function emojiFor(type: LiveReactionEvent["type"]): string {
  return LIVE_REACTION_TYPES.find((item) => item.type === type)?.emoji ?? "❤️";
}

function FloatingEmoji({
  reaction,
  onDone,
}: {
  reaction: LiveReactionEvent;
  onDone: (id: string) => void;
}) {
  const [translateY] = useState(() => new Animated.Value(0));
  const [translateX] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.35));
  const [drift] = useState(() => (Math.random() - 0.5) * 36);
  const [lift] = useState(() => 140 + Math.random() * 70);

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(translateY, {
        toValue: -lift,
        duration: 2300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: drift,
        duration: 2300,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.25,
          friction: 5,
          tension: 140,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(opacity, {
          toValue: 0,
          duration: CHIP_FADE_MS,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        onDone(reaction.id);
      }
    });

    return () => {
      animation.stop();
    };
  }, [drift, lift, onDone, opacity, reaction.id, scale, translateX, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.emojiWrap,
        {
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    >
      <Text style={styles.emoji}>{emojiFor(reaction.type)}</Text>
    </Animated.View>
  );
}

function ReactionChip({ reaction }: { reaction: LiveReactionEvent }) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(12));
  const [remaining] = useState(() =>
    Math.max(0, CHIP_VISIBLE_MS - (Date.now() - reaction.at)),
  );

  useEffect(() => {
    const hold = Math.max(0, remaining - CHIP_FADE_MS);
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(hold),
      Animated.timing(opacity, {
        toValue: 0,
        duration: CHIP_FADE_MS,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity, remaining, translateY]);

  return (
    <Animated.View
      style={[
        styles.chip,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.chipEmoji}>{emojiFor(reaction.type)}</Text>
      <Text style={styles.chipName} numberOfLines={1}>
        {reaction.user.name}
      </Text>
    </Animated.View>
  );
}

export default function LiveReactionBurst({
  reactions,
  showChips = true,
  chipBottom = 14,
}: {
  reactions: LiveReactionEvent[];
  showChips?: boolean;
  chipBottom?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  const visible = reactions.slice(-8);
  const chips = reactions
    .filter((reaction) => now - reaction.at < CHIP_VISIBLE_MS)
    .slice(-3)
    .reverse();

  useEffect(() => {
    if (reactions.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      clearInterval(timer);
    };
  }, [reactions.length]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {showChips ? (
        <View style={[styles.chipStack, { bottom: chipBottom }]}>
          {chips.map((reaction) => (
            <ReactionChip key={reaction.id} reaction={reaction} />
          ))}
        </View>
      ) : null}
      <View style={styles.burst}>
        {visible.map((reaction) => (
          <FloatingEmoji key={reaction.id} reaction={reaction} onDone={() => undefined} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipStack: {
    position: "absolute",
    left: 12,
    gap: 6,
    maxWidth: "58%",
    zIndex: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(8, 12, 24, 0.78)",
  },
  chipEmoji: { fontSize: 14 },
  chipName: { color: "#ffffff", fontSize: 13, fontWeight: "700", maxWidth: 140 },
  burst: {
    position: "absolute",
    right: 58,
    bottom: 18,
    width: 56,
    height: 220,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  emojiWrap: {
    position: "absolute",
    bottom: 0,
  },
  emoji: {
    fontSize: 30,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
