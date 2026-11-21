import { resolve } from 'node:path';
import type { GpuProviderName } from './contracts';

export type GpuOrchestratorConfig = {
    host: string;
    port: number;
    provisioningEnabled: boolean;
    provider: GpuProviderName;
    maxActiveInstances: 1;
    maxHourlyPrice: number;
    maxDailyBudget: number;
    maxMonthlyBudget: number;
    idleTimeoutSeconds: number;
    capabilityTtlSeconds: number;
    bootstrapTtlSeconds: number;
    workerHeartbeatSeconds: number;
    workerLostSeconds: number;
    jobTimeoutSeconds: number;
    commercialUseApproved: boolean;
    workerImage: string;
    modelManifestPath: string;
    ledgerPath: string;
    capabilitySecret: string;
    providerApiKey: string;
    providerApiBaseUrl: string;
    providerRequestTimeoutMs: number;
    workerEndpointsEnabled: boolean;
    maxResultBytes: number;
    benchmarkQueueKey: string;
};

function booleanValue(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
    const value = (env[name] ?? (fallback ? '1' : '0')).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(value)) return true;
    if (['0', 'false', 'no', 'off'].includes(value)) return false;
    throw new Error(`Invalid boolean for ${name}.`);
}

function integerValue(env: NodeJS.ProcessEnv, name: string, fallback: number, min: number, max: number): number {
    const value = Number(env[name] ?? fallback);
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid integer for ${name}.`);
    return value;
}

function moneyValue(env: NodeJS.ProcessEnv, name: string): number {
    const value = Number(env[name] ?? 0);
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000) throw new Error(`Invalid monetary limit for ${name}.`);
    return Math.round(value * 1_000_000) / 1_000_000;
}

function providerValue(env: NodeJS.ProcessEnv): GpuProviderName {
    const value = (env.GPU_PROVIDER ?? 'disabled').trim().toLowerCase();
    if (value === 'disabled' || value === 'runpod' || value === 'vast') return value;
    throw new Error('GPU_PROVIDER must be disabled, runpod, or vast.');
}

function secretValue(env: NodeJS.ProcessEnv, name: string): string {
    const value = env[name]?.trim() ?? '';
    if (value && value.length < 32) throw new Error(`${name} must contain at least 32 characters when set.`);
    return value;
}

export function loadGpuOrchestratorConfig(env: NodeJS.ProcessEnv = process.env): GpuOrchestratorConfig {
    const maxActiveInstances = integerValue(env, 'GPU_MAX_ACTIVE_INSTANCES', 1, 1, 1);
    const config: GpuOrchestratorConfig = {
        host: env.GPU_ORCHESTRATOR_HOST?.trim() || '127.0.0.1',
        port: integerValue(env, 'GPU_ORCHESTRATOR_PORT', 3110, 1, 65535),
        provisioningEnabled: booleanValue(env, 'GPU_PROVISIONING_ENABLED', false),
        provider: providerValue(env),
        maxActiveInstances: maxActiveInstances as 1,
        maxHourlyPrice: moneyValue(env, 'GPU_MAX_HOURLY_PRICE'),
        maxDailyBudget: moneyValue(env, 'GPU_MAX_DAILY_BUDGET'),
        maxMonthlyBudget: moneyValue(env, 'GPU_MAX_MONTHLY_BUDGET'),
        idleTimeoutSeconds: integerValue(env, 'GPU_IDLE_TIMEOUT_SECONDS', 300, 60, 3600),
        capabilityTtlSeconds: integerValue(env, 'GPU_CAPABILITY_TTL_SECONDS', 900, 30, 900),
        bootstrapTtlSeconds: integerValue(env, 'GPU_BOOTSTRAP_TTL_SECONDS', 7200, 900, 14_400),
        workerHeartbeatSeconds: integerValue(env, 'GPU_WORKER_HEARTBEAT_SECONDS', 15, 5, 60),
        workerLostSeconds: integerValue(env, 'GPU_WORKER_LOST_SECONDS', 90, 30, 600),
        jobTimeoutSeconds: integerValue(env, 'GPU_JOB_TIMEOUT_SECONDS', 7200, 300, 24 * 3600),
        commercialUseApproved: booleanValue(env, 'SWIFTVR_COMMERCIAL_USE_APPROVED', false),
        workerImage: env.GPU_WORKER_IMAGE?.trim() || '',
        modelManifestPath: resolve(env.GPU_MODEL_MANIFEST_PATH?.trim() || './deploy/gpu-worker/model-manifest.json'),
        ledgerPath: resolve(env.GPU_COST_LEDGER_PATH?.trim() || './storage/video/state/gpu-cost-ledger.jsonl'),
        capabilitySecret: secretValue(env, 'GPU_CAPABILITY_SECRET'),
        providerApiKey: env.GPU_PROVIDER_API_KEY?.trim() || '',
        providerApiBaseUrl: env.GPU_PROVIDER_API_BASE_URL?.trim().replace(/\/+$/, '') || '',
        providerRequestTimeoutMs: integerValue(env, 'GPU_PROVIDER_REQUEST_TIMEOUT_MS', 20_000, 1_000, 60_000),
        workerEndpointsEnabled: booleanValue(env, 'GPU_WORKER_ENDPOINTS_ENABLED', false),
        maxResultBytes: integerValue(env, 'GPU_MAX_RESULT_BYTES', 4 * 1024 ** 3, 1024 ** 2, 16 * 1024 ** 3),
        benchmarkQueueKey: env.GPU_BENCHMARK_QUEUE_KEY?.trim() || 'azmigrantat:video:enhancement:gpu-benchmark',
    };
    if (config.workerLostSeconds <= config.workerHeartbeatSeconds * 2) throw new Error('GPU_WORKER_LOST_SECONDS must exceed two heartbeat intervals.');
    return config;
}

export function gpuActivationBlockers(config: GpuOrchestratorConfig): string[] {
    const blockers: string[] = [];
    if (!config.provisioningEnabled) blockers.push('gpu_provisioning_disabled');
    if (config.provider === 'disabled') blockers.push('gpu_provider_disabled');
    if (config.maxHourlyPrice <= 0) blockers.push('gpu_hourly_price_limit_missing');
    if (config.maxDailyBudget <= 0) blockers.push('gpu_daily_budget_missing');
    if (config.maxMonthlyBudget <= 0) blockers.push('gpu_monthly_budget_missing');
    if (!config.workerImage.includes('@sha256:')) blockers.push('gpu_worker_image_not_digest_pinned');
    if (!config.commercialUseApproved) blockers.push('swiftvr_commercial_permission_missing');
    if (!config.capabilitySecret) blockers.push('gpu_capability_secret_missing');
    if (!config.workerEndpointsEnabled) blockers.push('gpu_worker_endpoints_disabled');
    if (config.provider !== 'disabled' && !config.providerApiKey) blockers.push('gpu_provider_api_key_missing');
    return blockers;
}
