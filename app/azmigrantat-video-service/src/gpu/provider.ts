import type { GpuInstance, GpuInstanceRequest, GpuProviderName } from './contracts';
import { request as httpsRequest } from 'node:https';

const MANAGED_PREFIX = 'azmigrantat-gpu-';

export interface GpuProvider {
    readonly name: GpuProviderName;
    listManagedInstances(): Promise<GpuInstance[]>;
    createInstance(request: GpuInstanceRequest): Promise<GpuInstance>;
    inspectInstance(instanceId: string): Promise<GpuInstance>;
    stopInstance(instanceId: string): Promise<GpuInstance>;
    releaseInstance(instanceId: string): Promise<void>;
}

export class DisabledGpuProvider implements GpuProvider {
    readonly name = 'disabled' as const;
    async listManagedInstances(): Promise<GpuInstance[]> { return []; }
    async createInstance(_request: GpuInstanceRequest): Promise<GpuInstance> { throw new Error('GPU provider is disabled.'); }
    async inspectInstance(_instanceId: string): Promise<GpuInstance> { throw new Error('GPU provider is disabled.'); }
    async stopInstance(_instanceId: string): Promise<GpuInstance> { throw new Error('GPU provider is disabled.'); }
    async releaseInstance(_instanceId: string): Promise<void> { throw new Error('GPU provider is disabled.'); }
}

export class GpuProviderHttpError extends Error {
    constructor(readonly status: number, readonly method: string, readonly path: string, message: string) {
        super(`${method} ${path} failed with HTTP ${status}: ${message}`);
    }
}

export class AmbiguousGpuCreateError extends Error {
    constructor(readonly provider: Exclude<GpuProviderName, 'disabled'>, readonly requestId: string, cause: unknown) {
        super(`${provider} create outcome is ambiguous for ${requestId}; reconcile by managed label before any retry.`, { cause });
    }
}

type HttpOptions = { apiKey: string; baseUrl: string; timeoutMs?: number; fetchImpl?: typeof fetch };

class ProviderHttpClient {
    private readonly timeoutMs: number;
    constructor(private readonly options: HttpOptions) {
        this.timeoutMs = options.timeoutMs ?? 20_000;
        if (!options.apiKey) throw new Error('GPU provider API key is missing.');
        if (!/^https:\/\//.test(options.baseUrl)) throw new Error('GPU provider API base URL must use HTTPS.');
    }
    async request<T>(method: string, path: string, body?: unknown, accepted: number[] = [200]): Promise<T> {
        const target = new URL(path, `${this.options.baseUrl}/`);
        if (target.origin !== new URL(this.options.baseUrl).origin || target.protocol !== 'https:') throw new Error('Unsafe GPU provider request URL.');
        const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
        const response = this.options.fetchImpl
            ? await this.fetchResponse(method, target, payload)
            : await this.httpsResponse(method, target, payload);
        const text = response.text;
        if (!accepted.includes(response.status)) throw new GpuProviderHttpError(response.status, method, path, sanitizeProviderError(text));
        if (!text.trim()) return undefined as T;
        try { return JSON.parse(text) as T; }
        catch { throw new GpuProviderHttpError(response.status, method, path, 'Provider returned invalid JSON.'); }
    }
    private async fetchResponse(method: string, target: URL, payload?: Buffer): Promise<{ status: number; text: string }> {
        const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await this.options.fetchImpl!(target, {
                method,
                headers: this.headers(payload),
                body: payload?.toString('utf8'),
                redirect: 'error',
                signal: controller.signal,
            });
            return { status: response.status, text: await response.text() };
        } finally { clearTimeout(timer); }
    }
    private async httpsResponse(method: string, target: URL, payload?: Buffer): Promise<{ status: number; text: string }> {
        return await new Promise((resolve, reject) => {
            const request = httpsRequest(target, { method, headers: this.headers(payload) }, (response) => {
                const status = response.statusCode || 0;
                if (status >= 300 && status < 400) { response.resume(); reject(new Error('GPU provider redirects are not permitted.')); return; }
                const chunks: Buffer[] = []; let size = 0;
                response.on('data', (raw: Buffer | string) => {
                    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw); size += chunk.length;
                    if (size > 8 * 1024 * 1024) request.destroy(new Error('GPU provider response is too large.'));
                    else chunks.push(chunk);
                });
                response.on('end', () => resolve({ status, text: Buffer.concat(chunks).toString('utf8') }));
            });
            request.setTimeout(this.timeoutMs, () => request.destroy(new Error('GPU provider request timed out.')));
            request.on('error', reject);
            if (payload) request.write(payload);
            request.end();
        });
    }
    private headers(payload?: Buffer): Record<string, string> {
        return {
            authorization: `Bearer ${this.options.apiKey}`,
            accept: 'application/json',
            'user-agent': 'azmigrantat-gpu-orchestrator/1',
            ...(payload ? { 'content-type': 'application/json', 'content-length': String(payload.length) } : {}),
        };
    }
}

function sanitizeProviderError(value: string): string { return value.replace(/[\r\n\t]+/g, ' ').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 500); }
function finiteNumber(value: unknown): number { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : 0; }
function isoDate(value: unknown): string { const parsed = typeof value === 'number' ? (value < 10_000_000_000 ? value * 1000 : value) : typeof value === 'string' ? Date.parse(value) : NaN; return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date(0).toISOString(); }
function managedName(requestId: string): string {
    if (!/^[a-zA-Z0-9._-]{1,80}$/.test(requestId)) throw new Error('Unsafe GPU provider request ID.');
    return `${MANAGED_PREFIX}${requestId}`;
}
function requireCreateRequest(request: GpuInstanceRequest): void {
    if (request.gpu_type !== 'NVIDIA GeForce RTX 5090' || request.gpu_count !== 1) throw new Error('Only one NVIDIA GeForce RTX 5090 is permitted.');
    if (!request.image.includes('@sha256:')) throw new Error('GPU worker image must be digest pinned.');
    if (!Number.isFinite(request.max_hourly_price) || request.max_hourly_price <= 0) throw new Error('A positive per-instance hourly ceiling is required.');
    if (!Number.isInteger(request.disk_gb) || request.disk_gb < 80 || request.disk_gb > 500) throw new Error('GPU disk size is outside the permitted range.');
}
function safeEnvironment(environment: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(environment)) {
        if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(key) || value.length > 4096 || /[\r\n\0]/.test(value)) throw new Error('Unsafe GPU worker environment value.');
        result[key] = value;
    }
    return result;
}

type RunpodPod = { id?: unknown; name?: unknown; status?: unknown; cost?: unknown; gpu?: { id?: unknown }; createdAt?: unknown; startedAt?: unknown };
type RunpodPodListResponse = RunpodPod[] | { pods?: unknown; pagination?: unknown };

function runpodPods(response: RunpodPodListResponse): RunpodPod[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.pods)) return response.pods as RunpodPod[];
    throw new Error('Runpod list response is missing the pods array.');
}

export class RunpodGpuProvider implements GpuProvider {
    readonly name = 'runpod' as const; private readonly http: ProviderHttpClient;
    constructor(options: Omit<HttpOptions, 'baseUrl'> & { baseUrl?: string }) { this.http = new ProviderHttpClient({ ...options, baseUrl: options.baseUrl || 'https://api.runpod.io' }); }
    async listManagedInstances(): Promise<GpuInstance[]> {
        const pods = runpodPods(await this.http.request<RunpodPodListResponse>('GET', '/v2/pods'));
        return pods.filter((pod) => typeof pod.name === 'string' && pod.name.startsWith(MANAGED_PREFIX)).map((pod) => this.normalize(pod));
    }
    async createInstance(request: GpuInstanceRequest): Promise<GpuInstance> {
        requireCreateRequest(request); const name = managedName(request.request_id);
        const managed = await this.listManagedInstances();
        const existing = managed.filter((instance) => instance.request_id === request.request_id);
        if (existing.length > 1) throw new Error(`Multiple Runpod instances match request ${request.request_id}.`);
        if (existing[0]) return existing[0];
        if (managed.length > 0) throw new Error('A managed GPU instance already exists; maximum active instances is one.');
        let pod: RunpodPod;
        try {
            pod = await this.http.request<RunpodPod>('POST', '/v2/pods', {
                name, image: request.image, args: '', disk: request.disk_gb, ports: [], env: safeEnvironment(request.environment),
                gpu: { id: request.gpu_type, count: 1, minRamPerGpu: 32, minVcpuCountPerGpu: request.minimum_vcpu_count },
                ...(request.allowed_data_center_ids?.length ? { dataCenterIds: request.allowed_data_center_ids } : {}),
                cloud: 'SECURE', startSsh: false, startJupyter: false, ...(request.registry_credential ? { registry: request.registry_credential } : {}),
            }, [201]);
        } catch (error) {
            if (error instanceof GpuProviderHttpError && error.status < 500 && ![408, 429].includes(error.status)) throw error;
            throw new AmbiguousGpuCreateError(this.name, request.request_id, error);
        }
        if (typeof pod.id !== 'string') throw new AmbiguousGpuCreateError(this.name, request.request_id, new Error('Create response did not contain a pod ID.'));
        const normalized = this.normalize(pod);
        if (normalized.hourly_price <= 0 || normalized.hourly_price > request.max_hourly_price) {
            await this.releaseInstance(normalized.instance_id).catch(() => undefined);
            throw new Error('Runpod returned an unpriced or over-ceiling pod; release was requested.');
        }
        return normalized;
    }
    async inspectInstance(instanceId: string): Promise<GpuInstance> { return this.normalize(await this.http.request<RunpodPod>('GET', `/v2/pods/${encodeURIComponent(instanceId)}`)); }
    async stopInstance(instanceId: string): Promise<GpuInstance> { await this.http.request<unknown>('POST', `/v2/pods/${encodeURIComponent(instanceId)}/action`, { action: 'stop' }, [200, 202]); return this.inspectInstance(instanceId); }
    async releaseInstance(instanceId: string): Promise<void> { try { await this.http.request<unknown>('DELETE', `/v2/pods/${encodeURIComponent(instanceId)}`, undefined, [200, 202, 204]); } catch (error) { if (!(error instanceof GpuProviderHttpError) || error.status !== 404) throw error; } }
    private normalize(pod: RunpodPod): GpuInstance {
        if (typeof pod.id !== 'string' || !pod.id) throw new Error('Runpod pod is missing an ID.');
        const status = String(pod.status || '').toUpperCase();
        const state: GpuInstance['state'] = status === 'RUNNING' ? 'ready' : ['EXITED', 'TERMINATED'].includes(status) ? 'stopped' : status === 'ERROR' ? 'failed' : status === 'STOPPING' ? 'stopping' : 'starting';
        const name = typeof pod.name === 'string' ? pod.name : '';
        return { provider: this.name, instance_id: pod.id, state, hourly_price: finiteNumber(pod.cost), gpu_name: String(pod.gpu?.id || ''), created_at: isoDate(pod.createdAt), ...(pod.startedAt ? { ready_at: isoDate(pod.startedAt) } : {}), ...(name.startsWith(MANAGED_PREFIX) ? { request_id: name.slice(MANAGED_PREFIX.length) } : {}) };
    }
}

type VastOffer = { id?: unknown; ask_contract_id?: unknown; gpu_name?: unknown; dph_total?: unknown };
type VastInstance = { id?: unknown; label?: unknown; actual_status?: unknown; cur_state?: unknown; intended_status?: unknown; gpu_name?: unknown; dph_total?: unknown; start_date?: unknown; created_at?: unknown };

export class VastGpuProvider implements GpuProvider {
    readonly name = 'vast' as const; private readonly http: ProviderHttpClient;
    constructor(options: Omit<HttpOptions, 'baseUrl'> & { baseUrl?: string }) { this.http = new ProviderHttpClient({ ...options, baseUrl: options.baseUrl || 'https://console.vast.ai' }); }
    async listManagedInstances(): Promise<GpuInstance[]> {
        const response = await this.http.request<{ instances?: VastInstance[] }>('GET', '/api/v1/instances');
        return (response.instances || []).filter((instance) => typeof instance.label === 'string' && instance.label.startsWith(MANAGED_PREFIX)).map((instance) => this.normalize(instance));
    }
    async createInstance(request: GpuInstanceRequest): Promise<GpuInstance> {
        requireCreateRequest(request); const label = managedName(request.request_id);
        const managed = await this.listManagedInstances();
        const existing = managed.filter((instance) => instance.request_id === request.request_id);
        if (existing.length > 1) throw new Error(`Multiple Vast.ai instances match request ${request.request_id}.`);
        if (existing[0]) return existing[0];
        if (managed.length > 0) throw new Error('A managed GPU instance already exists; maximum active instances is one.');
        const offersResponse = await this.http.request<{ offers?: VastOffer[] }>('POST', '/api/v0/bundles', {
            limit: 20, type: 'on-demand', verified: { eq: true }, rentable: { eq: true }, rented: { eq: false },
            gpu_name: { eq: 'RTX 5090' }, num_gpus: { eq: 1 }, gpu_ram: { gte: 32768 }, cuda_max_good: { gte: 12.8 },
            cpu_ram: { gte: request.minimum_memory_gb * 1024 }, cpu_cores_effective: { gte: request.minimum_vcpu_count }, disk_space: { gte: request.disk_gb },
            reliability2: { gte: 0.99 }, dph_total: { lte: request.max_hourly_price }, order: [['dph_total', 'asc']],
        });
        const offer = (offersResponse.offers || []).filter((candidate) => String(candidate.gpu_name).includes('RTX 5090') && finiteNumber(candidate.dph_total) <= request.max_hourly_price).sort((a, b) => finiteNumber(a.dph_total) - finiteNumber(b.dph_total))[0];
        const offerId = offer?.id ?? offer?.ask_contract_id;
        if ((typeof offerId !== 'string' && typeof offerId !== 'number') || !offerId) throw new Error('No verified rentable Vast.ai RTX 5090 offer is within the approved price ceiling.');
        const env = Object.entries(safeEnvironment(request.environment)).map(([key, value]) => `-e ${key}=${vastEnvValue(value)}`).join(' ');
        let created: { success?: boolean; new_contract?: string | number };
        try { created = await this.http.request('PUT', `/api/v0/asks/${encodeURIComponent(String(offerId))}`, { image: request.image, disk: request.disk_gb, label, runtype: 'args', target_state: 'running', cancel_unavail: true, env, ...(request.registry_credential ? { image_login: request.registry_credential } : {}) }, [200, 201]); }
        catch (error) { if (error instanceof GpuProviderHttpError && error.status < 500 && ![408, 429].includes(error.status)) throw error; throw new AmbiguousGpuCreateError(this.name, request.request_id, error); }
        if (!created.success || created.new_contract === undefined) throw new AmbiguousGpuCreateError(this.name, request.request_id, new Error('Create response did not contain an instance ID.'));
        return this.inspectInstance(String(created.new_contract));
    }
    async inspectInstance(instanceId: string): Promise<GpuInstance> { const response = await this.http.request<{ instances?: VastInstance }>('GET', `/api/v0/instances/${encodeURIComponent(instanceId)}`); if (!response.instances) throw new Error('Vast.ai response is missing instance data.'); return this.normalize(response.instances); }
    async stopInstance(instanceId: string): Promise<GpuInstance> { await this.http.request<unknown>('PUT', `/api/v0/instances/${encodeURIComponent(instanceId)}`, { state: 'stopped' }, [200, 202]); return this.inspectInstance(instanceId); }
    async releaseInstance(instanceId: string): Promise<void> { try { await this.http.request<unknown>('DELETE', `/api/v0/instances/${encodeURIComponent(instanceId)}`, undefined, [200, 202, 204]); } catch (error) { if (!(error instanceof GpuProviderHttpError) || error.status !== 404) throw error; } }
    private normalize(instance: VastInstance): GpuInstance {
        if ((typeof instance.id !== 'string' && typeof instance.id !== 'number') || !instance.id) throw new Error('Vast.ai instance is missing an ID.');
        const actual = String(instance.actual_status || instance.cur_state || '').toLowerCase(); const intended = String(instance.intended_status || '').toLowerCase();
        const state: GpuInstance['state'] = actual === 'running' ? 'ready' : actual === 'stopped' || intended === 'stopped' ? 'stopped' : ['failed', 'error'].includes(actual) ? 'failed' : actual === 'stopping' ? 'stopping' : 'starting';
        const label = typeof instance.label === 'string' ? instance.label : '';
        const started = instance.created_at ?? instance.start_date;
        return { provider: this.name, instance_id: String(instance.id), state, hourly_price: finiteNumber(instance.dph_total), gpu_name: String(instance.gpu_name || ''), created_at: isoDate(started), ...(actual === 'running' ? { ready_at: isoDate(started) } : {}), ...(label.startsWith(MANAGED_PREFIX) ? { request_id: label.slice(MANAGED_PREFIX.length) } : {}) };
    }
}

function vastEnvValue(value: string): string { if (!/^[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/.test(value)) throw new Error('Vast.ai environment values must be URL-safe tokens.'); return value; }

export function createGpuProvider(provider: GpuProviderName, options: { apiKey: string; baseUrl?: string; timeoutMs?: number; fetchImpl?: typeof fetch }): GpuProvider {
    if (provider === 'disabled') return new DisabledGpuProvider();
    if (provider === 'runpod') return new RunpodGpuProvider(options);
    return new VastGpuProvider(options);
}
