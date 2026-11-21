export const GPU_PROTOCOL_VERSION = 1 as const;

export type GpuProviderName = 'disabled' | 'runpod' | 'vast';
export type GpuCapabilityOperation = 'bootstrap' | 'download_source' | 'upload_result' | 'progress' | 'complete' | 'cancel_status';
export type GpuColdStartState = 'provisioning' | 'pulling' | 'initializing' | 'ready' | 'failed';
export type GpuJobState = 'reserved' | 'waiting_for_gpu' | GpuColdStartState | 'starting' | 'restoring' | 'finalizing' | 'uploading' | 'completed' | 'cancelled' | 'timeout';

export type GpuPaymentReservation = {
    version: 1;
    reservation_id: string;
    job_id: string;
    idempotency_key: string;
    state: 'confirmed' | 'released' | 'refunded';
    currency: string;
    amount_minor: number;
    confirmed_at: string;
};

export type GpuJobAuthorization = {
    version: 1;
    job_id: string;
    lease_token: string;
    worker_id: string;
    user_id: number;
    video_id: number;
    source_size: number;
    source_sha256?: string;
    target_width: number;
    target_height: number;
    timeout_seconds: number;
    model_id: string;
    model_revision: string;
    payment: GpuPaymentReservation;
};

export type GpuCapabilityClaims = {
    version: 1;
    audience: 'azmigrantat-gpu-worker';
    operation: GpuCapabilityOperation;
    job_id: string;
    lease_token: string;
    worker_id: string;
    nonce: string;
    issued_at: number;
    expires_at: number;
};

export type GpuWorkerProgress = {
    version: 1;
    job_id: string;
    lease_token: string;
    worker_id: string;
    state: Extract<GpuJobState, 'initializing' | 'ready' | 'starting' | 'restoring' | 'finalizing' | 'uploading'>;
    progress: number;
    processed_frames: number;
    total_frames: number;
    measured_fps?: number;
    gpu_memory_used_bytes?: number;
    gpu_utilization_percent?: number;
    heartbeat_at: string;
};

export type GpuWorkerCompletion = {
    version: 1;
    job_id: string;
    lease_token: string;
    worker_id: string;
    result_sha256: string;
    result_size: number;
    duration_seconds: number;
    width: number;
    height: number;
    fps: number;
    audio_present: boolean;
    processing_seconds: number;
    completed_at: string;
};

export type GpuInstanceRequest = {
    request_id: string;
    job_id: string;
    gpu_type: 'NVIDIA GeForce RTX 5090';
    gpu_count: 1;
    image: string;
    max_hourly_price: number;
    tags: Record<string, string>;
    disk_gb: number;
    minimum_vcpu_count: number;
    minimum_memory_gb: number;
    environment: Record<string, string>;
    allowed_data_center_ids?: string[];
    registry_credential?: string;
};

export type GpuInstance = {
    provider: Exclude<GpuProviderName, 'disabled'>;
    instance_id: string;
    state: 'starting' | 'ready' | 'stopping' | 'stopped' | 'failed';
    hourly_price: number;
    gpu_name: string;
    created_at: string;
    ready_at?: string;
    request_id?: string;
};

export type GpuCostLedgerEntry = {
    version: 1;
    event_id: string;
    event: 'instance_started' | 'instance_ready' | 'instance_stopped' | 'cost_accrued' | 'provision_denied';
    occurred_at: string;
    provider: GpuProviderName;
    instance_id?: string;
    job_id?: string;
    hourly_price?: number;
    amount?: number;
    currency: 'USD';
    reason?: string;
};
