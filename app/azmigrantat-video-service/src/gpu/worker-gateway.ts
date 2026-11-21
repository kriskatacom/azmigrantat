import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, open, realpath, rm, stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { VideoServiceConfig } from '../config';
import { EnhancementStore } from '../enhancement-store';
import { FencedRedisJsonQueue, redisCommand, type FencedQueueLease } from '../queue';
import type { EnhancementJob } from '../types';
import { signGpuCapability, verifyGpuCapability } from './capability';
import type { GpuOrchestratorConfig } from './config';
import type { GpuCapabilityClaims, GpuCapabilityOperation, GpuWorkerCompletion, GpuWorkerProgress } from './contracts';
import { reserveWorkerRequestNonce } from './singleton';

const JOB_PATH = /^\/v1\/gpu-worker\/jobs\/([a-f0-9-]{36})\/(source|result|progress|complete|cancel)$/i;

export class GpuWorkerGateway {
    private readonly jobs: EnhancementStore;
    private readonly queue: FencedRedisJsonQueue<EnhancementJob>;
    private readonly redisUrl: string;
    constructor(private readonly gpu: GpuOrchestratorConfig, video: VideoServiceConfig) {
        this.jobs = new EnhancementStore(video.root);
        this.queue = new FencedRedisJsonQueue<EnhancementJob>(video.redisUrl, gpu.benchmarkQueueKey);
        this.redisUrl = video.redisUrl;
    }
    async init(): Promise<void> { await this.jobs.init(); }

    async handle(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
        const pathname = new URL(request.url || '/', 'http://localhost').pathname;
        if (request.method === 'POST' && pathname === '/v1/gpu-worker/bootstrap') { await this.bootstrap(request, response); return true; }
        const match = pathname.match(JOB_PATH); if (!match) return false;
        const [, jobId, action] = match;
        const operation = ({ source: 'download_source', result: 'upload_result', progress: 'progress', complete: 'complete', cancel: 'cancel_status' } as const)[action as 'source' | 'result' | 'progress' | 'complete' | 'cancel'];
        const expectedMethod = action === 'source' || action === 'cancel' ? 'GET' : action === 'result' ? 'PUT' : 'POST';
        if (request.method !== expectedMethod) return this.json(response, 405, { error: 'method_not_allowed' }), true;
        const claims = await this.authorize(request, operation); if (claims.job_id !== jobId) throw new GatewayError(403, 'job_mismatch');
        const job = await this.liveJob(claims);
        if (action === 'source') await this.download(job, response);
        else if (action === 'result') await this.upload(request, response, claims);
        else if (action === 'progress') await this.progress(request, response, claims);
        else if (action === 'complete') await this.complete(request, response, claims);
        else this.json(response, 200, { cancel_requested: job.cancel_requested || await this.jobs.isCancelRequested(job.job_id), deadline_at: job.deadline_at });
        return true;
    }

    private async bootstrap(request: IncomingMessage, response: ServerResponse): Promise<void> {
        const claims = await this.authorize(request, 'bootstrap'); const job = await this.liveJob(claims);
        const capability = (operation: Exclude<GpuCapabilityOperation, 'bootstrap'>) => signGpuCapability({ operation, job_id: claims.job_id, lease_token: claims.lease_token, worker_id: claims.worker_id }, this.gpu.capabilitySecret, this.gpu.capabilityTtlSeconds);
        const target = targetDimensions(job);
        this.json(response, 200, {
            version: 1, job_id: job.job_id, target_short_side: job.target_short_side, target_width: target.width, target_height: target.height, deadline_at: job.deadline_at,
            paths: { source: `/v1/gpu-worker/jobs/${job.job_id}/source`, result: `/v1/gpu-worker/jobs/${job.job_id}/result`, progress: `/v1/gpu-worker/jobs/${job.job_id}/progress`, complete: `/v1/gpu-worker/jobs/${job.job_id}/complete`, cancel: `/v1/gpu-worker/jobs/${job.job_id}/cancel` },
            capabilities: { source: capability('download_source'), result: capability('upload_result'), progress: capability('progress'), complete: capability('complete'), cancel: capability('cancel_status') },
        });
    }
    private async download(job: EnhancementJob, response: ServerResponse): Promise<void> {
        let sourcePath: string;
        try { sourcePath = await realpath(job.source_path); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new GatewayError(404, 'source_missing'); throw error; }
        this.jobs.assertOwnedPath(sourcePath);
        const source = await stat(sourcePath); if (!source.isFile()) throw new GatewayError(404, 'source_missing');
        response.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': source.size, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
        createReadStream(sourcePath).pipe(response);
    }
    private async upload(request: IncomingMessage, response: ServerResponse, claims: GpuCapabilityClaims): Promise<void> {
        const declared = Number(request.headers['content-length'] || 0); if (!Number.isSafeInteger(declared) || declared <= 0 || declared > this.gpu.maxResultBytes) throw new GatewayError(413, 'invalid_result_size');
        const base = await this.jobs.aiAttemptProcessingPath(claims.job_id, claims.lease_token); const final = `${base}.gpu-upload`; const temporary = `${final}.${claims.nonce}.tmp`;
        const handle = await open(temporary, 'wx', 0o640); const hash = createHash('sha256'); let received = 0;
        try {
            for await (const raw of request) { const chunk = Buffer.from(raw); received += chunk.length; if (received > declared || received > this.gpu.maxResultBytes) throw new GatewayError(413, 'result_too_large'); hash.update(chunk); await handle.write(chunk); }
            await handle.sync(); await handle.close(); if (received !== declared) throw new GatewayError(400, 'truncated_result'); await this.liveJob(claims);
            try { await link(temporary, final); }
            catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new GatewayError(409, 'result_already_staged'); throw error; }
            await rm(temporary, { force: true });
        } catch (error) { await handle.close().catch(() => undefined); await rm(temporary, { force: true }); throw error; }
        this.json(response, 201, { accepted: true, bytes: received, sha256: hash.digest('hex') });
    }
    private async progress(request: IncomingMessage, response: ServerResponse, claims: GpuCapabilityClaims): Promise<void> {
        const body = await this.jsonBody<GpuWorkerProgress>(request, 32 * 1024); if (body.job_id !== claims.job_id || body.lease_token !== claims.lease_token || body.worker_id !== claims.worker_id || !Number.isFinite(body.progress)) throw new GatewayError(400, 'invalid_progress');
        const lease = this.lease(claims); if (!await this.queue.renew(lease, Math.min(300, this.gpu.workerLostSeconds))) throw new GatewayError(409, 'lease_lost');
        const updated = await this.jobs.updateIfExecutionToken(claims.job_id, claims.lease_token, (job) => {
            if (job.cancel_requested) return null;
            job.progress = Math.max(1, Math.min(97, Math.floor(body.progress)));
            if (body.state === 'initializing' || body.state === 'ready') job.gpu_lifecycle_state = body.state;
            return job;
        });
        if (!updated) throw new GatewayError(409, 'job_fenced');
        if ((body.state === 'initializing' || body.state === 'ready') && updated.gpu_request_id) await this.updateColdStartState(updated.gpu_request_id, claims.lease_token, body.state);
        this.json(response, 200, { accepted: true, cancel_requested: false, capabilities: this.rotatedCapabilities(claims) });
    }
    private async complete(request: IncomingMessage, response: ServerResponse, claims: GpuCapabilityClaims): Promise<void> {
        const body = await this.jsonBody<GpuWorkerCompletion>(request, 32 * 1024); const path = `${await this.jobs.aiAttemptProcessingPath(claims.job_id, claims.lease_token)}.gpu-upload`; const file = await stat(path);
        if (body.job_id !== claims.job_id || body.lease_token !== claims.lease_token || body.worker_id !== claims.worker_id || body.result_size !== file.size || file.size > this.gpu.maxResultBytes) throw new GatewayError(400, 'invalid_completion');
        const hash = await hashFile(path); if (hash !== body.result_sha256) throw new GatewayError(400, 'result_checksum_mismatch'); await this.liveJob(claims);
        const updated = await this.jobs.updateIfExecutionToken(claims.job_id, claims.lease_token, (job) => { if (job.cancel_requested) return null; job.progress = 98; return job; });
        if (!updated) throw new GatewayError(409, 'job_fenced');
        this.json(response, 202, { accepted: true, state: 'staged_for_oneprovider_validation_and_fenced_publication' });
    }
    private async authorize(request: IncomingMessage, operation: GpuCapabilityOperation): Promise<GpuCapabilityClaims> {
        const value = request.headers.authorization || '';
        if (!value.startsWith('Bearer ')) throw new GatewayError(401, 'capability_required');
        let claims: GpuCapabilityClaims;
        try { claims = verifyGpuCapability(value.slice(7), this.gpu.capabilitySecret, operation); }
        catch { throw new GatewayError(401, 'invalid_capability'); }
        const reserved = await reserveWorkerRequestNonce(
            this.redisUrl,
            'azmigrantat:gpu:worker-capability',
            claims.nonce,
            Math.max(30, claims.expires_at - Math.floor(Date.now() / 1000) + 60),
        );
        if (!reserved) throw new GatewayError(409, 'capability_replayed');
        return claims;
    }
    private async liveJob(claims: GpuCapabilityClaims): Promise<EnhancementJob> { const lease = this.lease(claims); if (!await this.queue.owns(lease)) throw new GatewayError(409, 'lease_lost'); const job = await this.jobs.get(claims.job_id); if (!job || job.execution_token !== claims.lease_token || job.status !== 'processing') throw new GatewayError(409, 'job_fenced'); if (Date.now() >= job.deadline_at) throw new GatewayError(410, 'job_deadline_expired'); return job; }
    private lease(claims: GpuCapabilityClaims): FencedQueueLease<EnhancementJob> { return { jobId: claims.job_id, workerId: claims.worker_id, token: claims.lease_token, envelope: {} as FencedQueueLease<EnhancementJob>['envelope'] }; }
    private rotatedCapabilities(claims: GpuCapabilityClaims): Record<string, string> { const issue = (operation: Exclude<GpuCapabilityOperation, 'bootstrap'>) => signGpuCapability({ operation, job_id: claims.job_id, lease_token: claims.lease_token, worker_id: claims.worker_id }, this.gpu.capabilitySecret, this.gpu.capabilityTtlSeconds); return { source: issue('download_source'), result: issue('upload_result'), progress: issue('progress'), complete: issue('complete'), cancel: issue('cancel_status') }; }
    private async updateColdStartState(requestId: string, leaseToken: string, state: 'initializing' | 'ready'): Promise<void> {
        if (!/^[a-f0-9-]{36}$/i.test(requestId)) throw new GatewayError(409, 'invalid_gpu_request');
        const script = "local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end; local value=cjson.decode(raw); if value.lease_token~=ARGV[1] then return 0 end; local rank={provisioning=0,pulling=1,initializing=2,ready=3}; if not rank[value.state] or rank[ARGV[2]]<rank[value.state] or rank[ARGV[2]]>rank[value.state]+1 then return 0 end; value.state=ARGV[2]; value.updated_at=ARGV[3]; redis.call('SET',KEYS[1],cjson.encode(value),'KEEPTTL'); return 1";
        const changed = await redisCommand(this.redisUrl, ['EVAL', script, '1', `azmigrantat:gpu:cold-start:session:${requestId}`, leaseToken, state, new Date().toISOString()]);
        if (Number(changed) !== 1) throw new GatewayError(409, 'cold_start_fenced');
    }
    private async jsonBody<T>(request: IncomingMessage, maximum: number): Promise<T> { const chunks: Buffer[] = []; let size = 0; for await (const raw of request) { const chunk = Buffer.from(raw); size += chunk.length; if (size > maximum) throw new GatewayError(413, 'body_too_large'); chunks.push(chunk); } try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T; } catch { throw new GatewayError(400, 'invalid_json'); } }
    private json(response: ServerResponse, status: number, value: unknown): void { response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }).end(JSON.stringify(value)); }
}

export class GatewayError extends Error { constructor(readonly status: number, readonly code: string) { super(code); } }
async function hashFile(path: string): Promise<string> { const hash = createHash('sha256'); for await (const chunk of createReadStream(path)) hash.update(chunk); return hash.digest('hex'); }
function targetDimensions(job: EnhancementJob): { width: number; height: number } { const sar = Number((job.input.sampleAspectRatio || '1:1').split(/[:/]/)[0]) / Number((job.input.sampleAspectRatio || '1:1').split(/[:/]/)[1]) || 1; let width = job.input.width * sar; let height = job.input.height; if (Math.abs(job.input.rotation || 0) % 180 === 90) [width, height] = [height, width]; const short = job.target_short_side; if (width <= height) return { width: short, height: Math.ceil((short * height / width) / 8) * 8 }; return { width: Math.ceil((short * width / height) / 8) * 8, height: short }; }
