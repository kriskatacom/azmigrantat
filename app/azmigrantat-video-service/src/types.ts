export const TUS_VERSION = '1.0.0';

export const UPLOAD_STATUSES = [
    'created',
    'uploading',
    'uploaded',
    'queued',
    'processing',
    'ready',
    'failed',
    'deleting',
] as const;

export type UploadStatus = (typeof UPLOAD_STATUSES)[number];

export type UploadMetadata = {
    filename?: string;
    filetype?: string;
};

export type UploadState = {
    uploadId: string;
    userId: number;
    videoId: number;
    provider?: 'oneprovider';
    status: UploadStatus;
    uploadLength: number;
    uploadOffset: number;
    mimeType: string;
    filename: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: number;
    sourcePath?: string;
    playbackPath?: string;
    thumbnailPath?: string;
    duration?: number;
    width?: number;
    height?: number;
    fileSize?: number;
    failureReason?: string;
};

export type UploadTokenClaims = {
    upload_id: string;
    user_id: number;
    video_id: number;
    exp: number;
    max_size: number;
    mime_type: string;
};

export type DeleteTokenClaims = {
    action: 'delete';
    provider: 'oneprovider';
    upload_id: string;
    user_id: number;
    video_id: number;
    exp: number;
};

export type EnhancementMethod = 'standard' | 'ai';
export type EnhancementTargetShortSide = 720 | 1080;
export type EnhancementMode = 'fast_720p' | 'fast_1080p' | 'ai_720p' | 'ai_1080p';
export type EnhancementStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout';
export type EnhancementFallbackPolicy = 'none' | 'allow_fast_720p' | 'allow_fast';

export type EnhancementTokenClaims = {
    action: 'enhancement';
    provider: 'oneprovider';
    upload_id: string;
    user_id: number;
    video_id: number;
    ai_allowed: boolean;
    exp: number;
};

export type EnhancementJob = {
    job_id: string;
    idempotency_key: string;
    upload_id: string;
    user_id: number;
    video_id: number;
    requested_mode: EnhancementMode;
    mode: EnhancementMode;
    requested_method: EnhancementMethod;
    method: EnhancementMethod;
    requested_target_short_side: EnhancementTargetShortSide;
    target_short_side: EnhancementTargetShortSide;
    fallback_policy: EnhancementFallbackPolicy;
    status: EnhancementStatus;
    source_path: string;
    output_path?: string;
    playback_url?: string;
    created_at: string;
    queued_at: string;
    started_at?: string;
    completed_at?: string;
    deadline_at: number;
    estimated_seconds: number;
    progress: number;
    processed_fps?: number;
    processed_frames?: number;
    cancel_requested?: boolean;
    execution_token?: string;
    execution_attempt?: number;
    failure_code?: string;
    failure_reason?: string;
    gpu_lifecycle_state?: 'provisioning' | 'pulling' | 'initializing' | 'ready' | 'failed';
    gpu_request_id?: string;
    input: ProbeResult;
    output?: ProbeResult;
};

export type EnhancementModeAvailability = {
    mode: EnhancementMode;
    label: string;
    method: EnhancementMethod;
    target_short_side: EnhancementTargetShortSide;
    /** Backward-compatible alias. The worker targets the short side, not literal height. */
    target_height: 720 | 1080;
    available: boolean;
    estimated_seconds: number | null;
    max_duration_seconds: number;
    reason?: string;
};

export type AiWorkerReadiness = {
    protocol_version: 1;
    ready: true;
    worker_id: string;
    checked_at: string;
    expires_at: number;
    engine: string;
    adapter_fingerprint: string;
    model_fingerprint: string;
    supported_target_short_sides: EnhancementTargetShortSide[];
};

export type ProcessingJob = {
    upload_id: string;
    user_id: number;
    video_id: number;
    source_path: string;
    mime_type: string;
    size: number;
    job_id?: string;
};

export type QueueEnvelope = {
    job: ProcessingJob;
    attempts: number;
    claimed_at: number;
    available_at: number;
    last_error?: string;
};

export type ProbeResult = {
    format: string;
    duration: number;
    size: number;
    videoCodec: string;
    audioCodec: string | null;
    width: number;
    height: number;
    fps?: number;
    frameCount?: number;
    nominalFps?: number;
    startTime?: number;
    videoStartTime?: number;
    audioStartTime?: number;
    audioDuration?: number;
    sampleAspectRatio?: string;
    displayAspectRatio?: number;
    rotation?: number;
    fieldOrder?: string;
    colorRange?: string;
    colorSpace?: string;
    colorTransfer?: string;
    colorPrimaries?: string;
};

export type ProcessingOutcome = {
    mode: 'direct' | 'remux' | 'transcode';
    outputPath: string;
    thumbnailPath: string;
    probe: ProbeResult;
};
