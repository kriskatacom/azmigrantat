export type VideoStatus =
  | "pending_upload"
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "deleted";

export type VideoStorageProvider = "bunny" | "oneprovider";

export interface VideoItem {
  id: number;
  category_id: number | null;
  place_id: number | null;
  place?: { id: number; name: string; type: string; country: string | null; region: string | null; city: string | null } | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  status: VideoStatus;
  bunny_status: number | null;
  mime_type: string | null;
  file_size: number | null;
  total_views: number;
  unique_viewers: number;
  comments_count?: number;
  created_at: string | null;
  provider?: VideoStorageProvider;
  processing_status?: string | null;
}

export interface BunnyUploadCredentials {
  provider?: "bunny";
  endpoint: string;
  library_id: number;
  video_id: string;
  authorization_signature: string;
  authorization_expire: number;
}

export interface DedicatedUploadCredentials {
  provider: "oneprovider";
  endpoint: string;
  upload_id: string;
  user_id: number;
  video_id: number;
  authorization_token: string;
  tus_resumable: "1.0.0";
}

export type VideoUploadCredentials = BunnyUploadCredentials | DedicatedUploadCredentials;

export interface BeginVideoUploadResponse {
  success: true;
  data: {
    video: VideoItem;
    upload: VideoUploadCredentials;
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

export type VideoEnhancementMethod = "standard" | "ai";
export type VideoEnhancementTargetShortSide = 720 | 1080;
export type VideoEnhancementMode = "fast_720p" | "fast_1080p" | "ai_720p" | "ai_1080p";
export type VideoEnhancementStatus = "pending" | "processing" | "completed" | "failed" | "cancelled" | "timeout";
export interface VideoEnhancementModeOption {
  mode: VideoEnhancementMode;
  label: string;
  method?: VideoEnhancementMethod;
  target_short_side?: VideoEnhancementTargetShortSide;
  target_height: 720 | 1080;
  available: boolean;
  estimated_seconds: number | null;
  max_duration_seconds: number;
  reason?: string;
}
export interface VideoEnhancementOptionsResponse {
  success: true;
  data: {
    enabled: boolean;
    input: { duration: number; width: number; height: number; fps?: number } | null;
    modes: VideoEnhancementModeOption[];
    combinations?: VideoEnhancementModeOption[];
    queue_depth: number;
    queue_depths?: { standard: number; ai: number };
    latest_job?: VideoEnhancementJob | null;
  };
}
export interface VideoEnhancementJob {
  job_id: string;
  video_id: number;
  requested_mode: VideoEnhancementMode;
  mode: VideoEnhancementMode;
  requested_method: VideoEnhancementMethod;
  method: VideoEnhancementMethod;
  requested_target_short_side: VideoEnhancementTargetShortSide;
  target_short_side: VideoEnhancementTargetShortSide;
  fallback_policy: "none" | "allow_fast_720p" | "allow_fast";
  status: VideoEnhancementStatus;
  progress: number;
  estimated_seconds: number | null;
  original_url: string | null;
  result_url: string | null;
  failure_code: string | null;
  failure_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
}
export interface VideoEnhancementJobResponse { success: true; data: VideoEnhancementJob; }
