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
};

export type ProcessingOutcome = {
    mode: 'direct' | 'remux' | 'transcode';
    outputPath: string;
    thumbnailPath: string;
    probe: ProbeResult;
};
