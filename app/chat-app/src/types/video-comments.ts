export type VideoCommentStatus = "active" | "deleted";

export interface VideoCommentUser {
  id: number;
  name: string;
  profile_image: string | null;
}

export interface VideoComment {
  id: number;
  video_id: number;
  parent_id: number | null;
  root_id: number | null;
  body: string | null;
  status: VideoCommentStatus;
  replies_count: number;
  likes_count: number;
  liked_by_me: boolean;
  can_delete: boolean;
  created_at: string | null;
  user: VideoCommentUser | null;
  reply_to_user: Pick<VideoCommentUser, "id" | "name"> | null;
}

export interface VideoCommentsPage {
  success: true;
  data: VideoComment[];
  pagination: {
    has_more: boolean;
    next_before_id: number | null;
    next_after_id: number | null;
  };
}

export interface VideoCommentResponse {
  success: true;
  data: VideoComment;
}

