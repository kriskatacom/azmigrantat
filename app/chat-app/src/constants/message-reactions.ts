export const MESSAGE_REACTION_TYPES = [
  "like",
  "dislike",
  "heart",
  "wow",
  "laugh",
  "clap",
  "fire",
  "sad",
  "pray",
  "party",
] as const;

export type MessageReactionType = (typeof MESSAGE_REACTION_TYPES)[number];

export type MessageReactionItem = {
  type: MessageReactionType;
  count: number;
  reacted: boolean;
};

export const MESSAGE_REACTIONS: {
  type: MessageReactionType;
  emoji: string;
  label: string;
}[] = [
  { type: "like", emoji: "👍", label: "Харесване" },
  { type: "dislike", emoji: "👎", label: "Нехаресване" },
  { type: "heart", emoji: "❤️", label: "Сърце" },
  { type: "wow", emoji: "😮", label: "Учудване" },
  { type: "laugh", emoji: "😂", label: "Смях" },
  { type: "clap", emoji: "👏", label: "Браво" },
  { type: "fire", emoji: "🔥", label: "Топ" },
  { type: "sad", emoji: "😢", label: "Тъга" },
  { type: "pray", emoji: "🙏", label: "Благодарност" },
  { type: "party", emoji: "🎉", label: "Празник" },
];

const REACTION_BY_TYPE = Object.fromEntries(
  MESSAGE_REACTIONS.map((reaction) => [reaction.type, reaction]),
) as Record<MessageReactionType, (typeof MESSAGE_REACTIONS)[number]>;

export function isMessageReactionType(value: string): value is MessageReactionType {
  return MESSAGE_REACTION_TYPES.includes(value as MessageReactionType);
}

export function getReactionEmoji(type: string): string {
  return isMessageReactionType(type) ? REACTION_BY_TYPE[type].emoji : type;
}

export function getReactionLabel(type: string): string {
  return isMessageReactionType(type) ? REACTION_BY_TYPE[type].label : type;
}
