import { randomUUID } from 'node:crypto';
import { chmod, rename, writeFile } from 'node:fs/promises';
import { loadConfig } from './config';
import { EnhancementStore } from './enhancement-store';
import { signGpuCapability } from './gpu/capability';
import { loadGpuOrchestratorConfig } from './gpu/config';
import type { GpuColdStartState } from './gpu/contracts';
import { FencedRedisJsonQueue, redisCommand, type FencedQueueLease } from './queue';
import type { EnhancementJob } from './types';

type ColdStartSession = {
    version: 1;
    request_id: string;
    job_id: string;
    worker_id: string;
    lease_token: string;
    state: GpuColdStartState;
    created_at: string;
    updated_at: string;
};

const UUID = /^[a-f0-9-]{36}$/i;
const PREFIX = 'azmigrantat:gpu:cold-start';

async function main(): Promise<void> {
    const [command, requestId, argument] = process.argv.slice(2);
    requireUuid(requestId, 'request ID');
    const video = loadConfig();
    const gpu = loadGpuOrchestratorConfig();
    const queue = new FencedRedisJsonQueue<EnhancementJob>(video.redisUrl, gpu.benchmarkQueueKey);
    const store = new EnhancementStore(video.root);
    await store.init();

    if (command === 'show') return print(await loadSession(video.redisUrl, requestId));
    if (process.env.GPU_APPROVED_REQUEST_ID !== requestId) throw new Error('GPU_APPROVED_REQUEST_ID must exactly match the cold-start request ID.');
    if (command === 'stage') {
        requireUuid(argument, 'job ID');
        if (process.env.GPU_BENCHMARK_STAGE_APPROVED !== '1') throw new Error('Benchmark queue staging requires GPU_BENCHMARK_STAGE_APPROVED=1.');
        const job = await store.get(argument);
        if (!job || job.status !== 'pending' || job.method !== 'ai' || job.target_short_side !== 720 || Date.now() >= job.deadline_at) throw new Error('Only a live pending AI 720p job can be staged for the GPU benchmark.');
        const aiQueue = new FencedRedisJsonQueue<EnhancementJob>(video.redisUrl, video.enhancementAiQueueKey);
        const removed = await aiQueue.removeQueued((candidate) => candidate.job_id === argument);
        if (removed !== 1) throw new Error('The exact benchmark job was not present exactly once in the AI queue.');
        const staged = await store.update(argument, (current) => current.status === 'pending' ? { ...current, gpu_lifecycle_state: 'provisioning', gpu_request_id: requestId } : null);
        if (!staged) { await aiQueue.enqueue(job); throw new Error('Benchmark job changed while it was being staged.'); }
        try { await queue.enqueue(staged); }
        catch (error) {
            await store.update(argument, (current) => current.status === 'pending' && current.gpu_request_id === requestId ? { ...current, gpu_lifecycle_state: undefined, gpu_request_id: undefined } : null);
            await aiQueue.enqueue(job); throw error;
        }
        return print({ staged: true, request_id: requestId, job_id: argument, queue: gpu.benchmarkQueueKey });
    }
    if (command === 'begin') {
        requireUuid(argument, 'job ID');
        if (process.env.GPU_COLD_START_APPROVED !== '1') throw new Error('Cold-start lease acquisition requires GPU_COLD_START_APPROVED=1.');
        const session = await begin(video.redisUrl, requestId, argument, queue, store, video.enhancementAiLeaseSeconds);
        const token = signGpuCapability({ operation: 'bootstrap', job_id: session.job_id, lease_token: session.lease_token, worker_id: session.worker_id }, gpu.capabilitySecret, gpu.bootstrapTtlSeconds);
        const tokenFile = required('GPU_BOOTSTRAP_TOKEN_FILE');
        const temporary = `${tokenFile}.${randomUUID()}.tmp`;
        await writeFile(temporary, `GPU_BOOTSTRAP_TOKEN=${token}\n`, { mode: 0o600 });
        await chmod(temporary, 0o600);
        await rename(temporary, tokenFile);
        return print(publicSession(session));
    }
    if (command === 'renew') {
        const current = await requireSession(video.redisUrl, requestId);
        const state = argument === 'current' ? current.state : stateValue(argument);
        const session = await renew(video.redisUrl, requestId, state, queue, store, video.enhancementAiLeaseSeconds, gpu.jobTimeoutSeconds);
        return print(publicSession(session));
    }
    if (command === 'fail') {
        const session = await requireSession(video.redisUrl, requestId);
        const lease = leaseFrom(session);
        await store.updateIfExecutionToken(session.job_id, session.lease_token, (job) => {
            job.gpu_lifecycle_state = 'failed'; job.status = 'failed'; job.failure_code = 'gpu_cold_start_failed';
            job.failure_reason = (argument || 'GPU cold start failed.').slice(0, 500); return job;
        });
        await queue.acknowledge(lease);
        await writeSession(video.redisUrl, { ...session, state: 'failed', updated_at: new Date().toISOString() }, gpu.jobTimeoutSeconds);
        await releaseActive(video.redisUrl, requestId);
        return print({ ...publicSession(session), state: 'failed' });
    }
    throw new Error('Usage: gpu-cold-start-control <stage REQUEST_ID JOB_ID|begin REQUEST_ID JOB_ID|renew REQUEST_ID STATE|show REQUEST_ID|fail REQUEST_ID [REASON]>');
}

async function begin(redisUrl: string, requestId: string, jobId: string, queue: FencedRedisJsonQueue<EnhancementJob>, store: EnhancementStore, leaseSeconds: number): Promise<ColdStartSession> {
    const existing = await loadSession(redisUrl, requestId);
    if (existing) {
        if (existing.job_id !== jobId || !await queue.owns(leaseFrom(existing))) throw new Error('Existing cold-start session is stale or belongs to another job.');
        return existing;
    }
    const activeKey = `${PREFIX}:active`;
    const acquired = await redisCommand(redisUrl, ['SET', activeKey, requestId, 'NX', 'EX', '7200']);
    if (acquired !== 'OK') {
        const active = await redisCommand(redisUrl, ['GET', activeKey]);
        throw new Error(`Another GPU cold-start session is active${active === requestId ? ' for this request but its session is missing' : ''}.`);
    }
    const workerId = randomUUID();
    const lease = await queue.claim(workerId, leaseSeconds);
    if (!lease) { await releaseActive(redisUrl, requestId); throw new Error('No staged GPU benchmark job is available.'); }
    if (lease.jobId !== jobId) {
        await queue.requeue(lease, 'GPU benchmark job ID mismatch'); await releaseActive(redisUrl, requestId);
        throw new Error('The staged GPU benchmark job does not match the approved job ID.');
    }
    const now = new Date().toISOString();
    const updated = await store.update(jobId, (job) => {
        if (job.status !== 'pending' || job.method !== 'ai' || job.target_short_side !== 720) return null;
        job.status = 'processing'; job.started_at = now; job.execution_token = lease.token;
        job.execution_attempt = lease.envelope.attempt + 1; job.gpu_lifecycle_state = 'provisioning'; job.gpu_request_id = requestId; job.progress = 1; return job;
    });
    if (!updated) {
        await queue.requeue(lease, 'GPU benchmark job state is not eligible'); await releaseActive(redisUrl, requestId);
        throw new Error('The approved benchmark job is not pending AI 720p work.');
    }
    const session: ColdStartSession = { version: 1, request_id: requestId, job_id: jobId, worker_id: workerId, lease_token: lease.token, state: 'provisioning', created_at: now, updated_at: now };
    await writeSession(redisUrl, session, 7200);
    return session;
}

async function renew(redisUrl: string, requestId: string, state: GpuColdStartState, queue: FencedRedisJsonQueue<EnhancementJob>, store: EnhancementStore, leaseSeconds: number, sessionTtl: number): Promise<ColdStartSession> {
    const session = await requireSession(redisUrl, requestId);
    if (session.state === 'failed') throw new Error('Failed cold-start sessions cannot be renewed.');
    if (!allowedTransition(session.state, state)) throw new Error(`Invalid cold-start transition ${session.state} -> ${state}.`);
    if (!await queue.renew(leaseFrom(session), leaseSeconds)) throw new Error('GPU cold-start lease was lost; provisioning must fail closed and the Pod must be released.');
    const updated = await store.updateIfExecutionToken(session.job_id, session.lease_token, (job) => { job.gpu_lifecycle_state = state; return job; });
    if (!updated) throw new Error('GPU cold-start job fencing check failed.');
    const next = { ...session, state, updated_at: new Date().toISOString() };
    await writeSession(redisUrl, next, sessionTtl);
    const extended = await redisCommand(redisUrl, ['EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('EXPIRE',KEYS[1],ARGV[2]); return 1 end; return 0", '1', `${PREFIX}:active`, requestId, String(sessionTtl)]);
    if (Number(extended) !== 1) throw new Error('GPU cold-start singleton was lost.');
    return next;
}

function allowedTransition(from: GpuColdStartState, to: GpuColdStartState): boolean {
    const rank: Record<GpuColdStartState, number> = { provisioning: 0, pulling: 1, initializing: 2, ready: 3, failed: 4 };
    return to !== 'failed' && rank[to] >= rank[from] && rank[to] <= rank[from] + 1;
}

function stateValue(value?: string): GpuColdStartState {
    if (value === 'provisioning' || value === 'pulling' || value === 'initializing' || value === 'ready') return value;
    throw new Error('Cold-start state must be provisioning, pulling, initializing, or ready.');
}
function sessionKey(requestId: string): string { return `${PREFIX}:session:${requestId}`; }
async function loadSession(redisUrl: string, requestId: string): Promise<ColdStartSession | null> { const value = await redisCommand(redisUrl, ['GET', sessionKey(requestId)]); return typeof value === 'string' ? JSON.parse(value) as ColdStartSession : null; }
async function requireSession(redisUrl: string, requestId: string): Promise<ColdStartSession> { const value = await loadSession(redisUrl, requestId); if (!value) throw new Error('GPU cold-start session does not exist.'); return value; }
async function writeSession(redisUrl: string, session: ColdStartSession, ttl: number): Promise<void> { await redisCommand(redisUrl, ['SET', sessionKey(session.request_id), JSON.stringify(session), 'EX', String(ttl)]); }
async function releaseActive(redisUrl: string, requestId: string): Promise<void> { await redisCommand(redisUrl, ['EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0", '1', `${PREFIX}:active`, requestId]); }
function leaseFrom(session: ColdStartSession): FencedQueueLease<EnhancementJob> { return { jobId: session.job_id, workerId: session.worker_id, token: session.lease_token, envelope: {} as FencedQueueLease<EnhancementJob>['envelope'] }; }
function publicSession(session: ColdStartSession): Omit<ColdStartSession, 'lease_token'> { const { lease_token: _secret, ...safe } = session; return safe; }
function requireUuid(value: string | undefined, label: string): asserts value is string { if (!value || !UUID.test(value)) throw new Error(`A valid ${label} is required.`); }
function required(name: string): string { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required.`); return value; }
function print(value: unknown): void { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }

void main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
