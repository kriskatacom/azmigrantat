export type VideoStatus =
  | "pending_upload"
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "deleted";

export interface VideoItem {
  id: number;
  category_id: number | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  status: VideoStatus;
  bunny_status: number | null;
  mime_type: string | null;
  file_size: number | null;
  total_views: number;
  unique_viewers: number;
  created_at: string | null;
}

export interface BunnyUploadCredentials {
  endpoint: string;
  library_id: number;
  video_id: string;
  authorization_signature: string;
  authorization_expire: number;
}

export interface BeginVideoUploadResponse {
  success: true;
  data: {
    video: VideoItem;
    upload: BunnyUploadCredentials;
  };
}

export interface VideoResponse {
  success: true;
  data: VideoItem;
}

export interface VideosResponse {
  success: true;
  data: VideoItem[];
}

export interface PublicVideoItem extends VideoItem {
  playback_url: string | null;
  user: {
    id: number;
    name: string;
    profile_image: string | null;
  } | null;
}

export interface PublicUserSearchItem {
  id: number;
  name: string;
  profile_image: string | null;
}

export interface PublicUserSearchResponse {
  success: true;
  data: PublicUserSearchItem[];
}

export interface PublicVideosResponse {
  success: true;
  data: PublicVideoItem[];
  pagination: {
    page: number;
    limit: number;
    seed: number;
    has_more: boolean;
  };
}

export interface VideoPagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface VideoPlaybackResponse {
  success: true;
  data: { url: string; expires_at: number };
}
