export type LiveStatus = "idle" | "live" | "ended";

export type LiveMediaProviderName = "mock" | "livekit";

export type LiveReactionType = "like" | "heart" | "fire" | "clap" | "wow";

export interface LiveUser {
  id: number;
  name: string;
  username?: string | null;
  public_code?: string | null;
  profile_image?: string | null;
  cover_image?: string | null;
  is_active?: boolean;
}

export interface LiveStream {
  id: number;
  title: string | null;
  status: LiveStatus;
  media_provider: LiveMediaProviderName | string;
  media_room_id: string | null;
  viewer_count: number;
  peak_viewer_count: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
  is_owner: boolean;
  cover_image?: string | null;
  owner: LiveUser | null;
}

export interface LiveComment {
  id: number;
  live_id: number;
  body: string;
  created_at: string | null;
  user: LiveUser | null;
}

export interface LiveListMeta {
  has_more: boolean;
  next_before_id: number | null;
}

export interface LiveStreamResponse {
  success: true;
  data: LiveStream;
}

export interface LiveListResponse {
  success: true;
  data: LiveStream[];
  meta: LiveListMeta;
}

export interface LiveCommentsResponse {
  success: true;
  data: LiveComment[];
  meta: LiveListMeta;
}

export interface LiveCommentResponse {
  success: true;
  data: LiveComment;
}

export const LIVE_REACTION_TYPES: Array<{
  type: LiveReactionType;
  emoji: string;
}> = [
  { type: "heart", emoji: "❤️" },
  { type: "fire", emoji: "🔥" },
  { type: "clap", emoji: "👏" },
  { type: "wow", emoji: "😮" },
  { type: "like", emoji: "👍" },
];
