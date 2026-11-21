import { loadGpuOrchestratorConfig } from './gpu/config';
import { createGpuProvider } from './gpu/provider';
import type { GpuInstanceRequest } from './gpu/contracts';

async function main(): Promise<void> {
    const [command, identifier] = process.argv.slice(2); const config = loadGpuOrchestratorConfig();
    if (config.provider === 'disabled') throw new Error('GPU_PROVIDER is disabled.');
    const provider = createGpuProvider(config.provider, { apiKey: config.providerApiKey, baseUrl: config.providerApiBaseUrl || undefined, timeoutMs: config.providerRequestTimeoutMs });
    if (command === 'list') return print(await provider.listManagedInstances());
    if (!identifier) throw new Error('An exact request or instance identifier is required.');
    if (command === 'inspect') return print(await provider.inspectInstance(identifier));
    if (process.env.GPU_PAID_ACTION_APPROVED !== '1') throw new Error('Mutating provider actions require GPU_PAID_ACTION_APPROVED=1 for this invocation.');
    if (command === 'stop') return print(await provider.stopInstance(identifier));
    if (command === 'release') { await provider.releaseInstance(identifier); return print({ released: true, instance_id: identifier }); }
    if (command === 'release-request') {
        if (process.env.GPU_APPROVED_REQUEST_ID !== identifier) throw new Error('GPU_APPROVED_REQUEST_ID must exactly match the release request ID.');
        const matches = (await provider.listManagedInstances()).filter((instance) => instance.request_id === identifier);
        for (const instance of matches) await provider.releaseInstance(instance.instance_id);
        const remaining = (await provider.listManagedInstances()).filter((instance) => instance.request_id === identifier);
        if (remaining.length > 0) throw new Error(`GPU request ${identifier} is still present after release.`);
        return print({ released: true, request_id: identifier, released_instances: matches.map((instance) => instance.instance_id) });
    }
    if (command !== 'create') throw new Error('Usage: gpu-provider-control <list|inspect|create|stop|release|release-request> [id]');
    if (!config.provisioningEnabled || config.maxHourlyPrice <= 0 || config.maxDailyBudget <= 0 || config.maxMonthlyBudget <= 0) throw new Error('Create is denied: provisioning and all financial ceilings must be explicitly positive.');
    if (process.env.GPU_APPROVED_REQUEST_ID !== identifier) throw new Error('GPU_APPROVED_REQUEST_ID must exactly match the create request ID.');
    const request: GpuInstanceRequest = {
        request_id: identifier, job_id: required('GPU_BENCHMARK_JOB_ID'), gpu_type: 'NVIDIA GeForce RTX 5090', gpu_count: 1,
        image: config.workerImage, max_hourly_price: config.maxHourlyPrice, disk_gb: Number(process.env.GPU_DISK_GB || 128), minimum_vcpu_count: 8, minimum_memory_gb: 32,
        tags: { component: 'swiftvr-benchmark', request_id: identifier }, environment: { GPU_ORCHESTRATOR_PUBLIC_URL: required('GPU_ORCHESTRATOR_PUBLIC_URL'), GPU_BOOTSTRAP_TOKEN: required('GPU_BOOTSTRAP_TOKEN') },
        ...(process.env.RUNPOD_DATA_CENTER_IDS ? { allowed_data_center_ids: process.env.RUNPOD_DATA_CENTER_IDS.split(',').map((value) => value.trim()).filter(Boolean) } : {}),
        ...(process.env.GPU_REGISTRY_CREDENTIAL_ID ? { registry_credential: process.env.GPU_REGISTRY_CREDENTIAL_ID } : {}),
    };
    print(await provider.createInstance(request));
}
function required(name: string): string { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required.`); return value; }
function print(value: unknown): void { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
void main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
