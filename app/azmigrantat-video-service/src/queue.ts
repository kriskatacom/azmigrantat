import { connect, type Socket } from 'node:net';
import { randomUUID } from 'node:crypto';
import type { ProcessingJob, QueueEnvelope } from './types';

export interface ProcessingQueue { enqueue(job: ProcessingJob): Promise<void>; }
export type QueueLease = { raw: string; envelope: QueueEnvelope };
export interface DurableProcessingQueue extends ProcessingQueue {
    claim(): Promise<QueueLease | null>;
    acknowledge(lease: QueueLease): Promise<void>;
    retry(lease: QueueLease, error: string, maxRetries: number): Promise<void>;
    recoverStale(leaseSeconds: number, maxRetries: number): Promise<void>;
}

export class InMemoryProcessingQueue implements ProcessingQueue {
    readonly jobs: ProcessingJob[] = [];
    async enqueue(job: ProcessingJob): Promise<void> { this.jobs.push(job); }
}

export class InMemoryDurableProcessingQueue implements DurableProcessingQueue {
    private readonly ready: QueueEnvelope[] = [];
    private readonly processing = new Map<string, QueueEnvelope>();
    readonly deadLetters: QueueEnvelope[] = [];
    readonly retryDelays: number[] = [];
    async enqueue(job: ProcessingJob): Promise<void> { this.ready.push(this.envelope(job)); }
    async claim(): Promise<QueueLease | null> { const envelope = this.ready.shift(); if (!envelope) return null; envelope.claimed_at = Date.now(); const raw = JSON.stringify(envelope); this.processing.set(raw, envelope); return { raw, envelope }; }
    async acknowledge(lease: QueueLease): Promise<void> { this.processing.delete(lease.raw); }
    async retry(lease: QueueLease, error: string, maxRetries: number): Promise<void> { this.processing.delete(lease.raw); const next = { ...lease.envelope, attempts: lease.envelope.attempts + 1, claimed_at: 0, last_error: error }; if (next.attempts >= maxRetries) this.deadLetters.push(next); else { this.retryDelays.push(2 ** next.attempts); this.ready.push(next); } }
    async recoverStale(leaseSeconds: number, maxRetries: number): Promise<void> { for (const [raw, envelope] of [...this.processing.entries()]) if (Date.now() - envelope.claimed_at >= leaseSeconds * 1000) await this.retry({ raw, envelope }, 'worker lease expired', maxRetries); }
    private envelope(job: ProcessingJob): QueueEnvelope { return { job: { ...job, job_id: job.job_id || randomUUID() }, attempts: 0, claimed_at: 0, available_at: Date.now() }; }
}

function command(parts: string[]): Buffer { return Buffer.from(`*${parts.length}\r\n${parts.map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join('')}`); }
export function redisTarget(value: string): { host: string; port: number; username?: string; password?: string } { const url = new URL(value); if (url.protocol !== 'redis:') throw new Error('Only redis:// URLs are supported.'); return { host: url.hostname || '127.0.0.1', port: Number(url.port || 6379), username: url.username ? decodeURIComponent(url.username) : undefined, password: url.password ? decodeURIComponent(url.password) : undefined }; }
function parseResp(buffer: Buffer): { value: string | number | null | Array<string | null>; consumed: number } | null {
    if (!buffer.length) return null;
    const type = String.fromCharCode(buffer[0]); const lineEnd = buffer.indexOf('\r\n'); if (lineEnd < 0) return null; const line = buffer.subarray(1, lineEnd).toString();
    if (type === '+' || type === '-' || type === ':') return { value: type === ':' ? Number(line) : line, consumed: lineEnd + 2 };
    if (type === '$') { const size = Number(line); if (size < 0) return { value: null, consumed: lineEnd + 2 }; const end = lineEnd + 2 + size; if (buffer.length < end + 2) return null; return { value: buffer.subarray(lineEnd + 2, end).toString(), consumed: end + 2 }; }
    if (type === '*') { const count = Number(line); let offset = lineEnd + 2; const values: Array<string | null> = []; for (let index = 0; index < count; index++) { const parsed = parseResp(buffer.subarray(offset)); if (!parsed) return null; values.push(typeof parsed.value === 'string' || parsed.value === null ? parsed.value : String(parsed.value)); offset += parsed.consumed; } return { value: values, consumed: offset }; }
    return null;
}
export async function redisCommand(url: string, parts: string[]): Promise<string | number | null | Array<string | null>> {
    const target = redisTarget(url);
    return new Promise((resolve, reject) => {
        let buffer = Buffer.alloc(0); let phase: 'auth' | 'command' = target.password ? 'auth' : 'command'; let settled = false; const socket: Socket = connect(target.port, target.host);
        const finish = (error?: Error, value?: string | number | null | Array<string | null>) => { if (settled) return; settled = true; socket.destroy(); error ? reject(error) : resolve(value ?? null); };
        socket.setTimeout(5000, () => finish(new Error('Redis queue timeout.'))); socket.once('error', (error) => finish(error));
        socket.on('data', (data) => { buffer = Buffer.concat([buffer, Buffer.from(data)]); const parsed = parseResp(buffer); if (!parsed) return; buffer = buffer.subarray(parsed.consumed); if (phase === 'auth') { if (typeof parsed.value === 'string' && parsed.value.startsWith('ERR')) return finish(new Error(`Redis authentication failed: ${parsed.value}`)); phase = 'command'; socket.write(command(parts)); } else finish(undefined, parsed.value); });
        socket.once('connect', () => socket.write(target.password ? command(target.username ? ['AUTH', target.username, target.password] : ['AUTH', target.password]) : command(parts)));
    });
}

export class RedisProcessingQueue implements DurableProcessingQueue {
    private readonly processingKey: string; private readonly retryKey: string; private readonly deadLetterKey: string;
    constructor(private readonly redisUrl: string, private readonly queueKey: string) { this.processingKey = `${queueKey}:processing`; this.retryKey = `${queueKey}:retry`; this.deadLetterKey = `${queueKey}:dead-letter`; }
    async enqueue(job: ProcessingJob): Promise<void> { await redisCommand(this.redisUrl, ['LPUSH', this.queueKey, JSON.stringify(this.envelope(job))]); }
    async claim(): Promise<QueueLease | null> { await this.promoteRetries(); const claimed = await redisCommand(this.redisUrl, ['EVAL', "local raw=redis.call('RPOP',KEYS[1]); if not raw then return nil end; local value=cjson.decode(raw); value.claimed_at=tonumber(ARGV[1]); local result=cjson.encode(value); redis.call('LPUSH',KEYS[2],result); return result", '2', this.queueKey, this.processingKey, String(Date.now())]); if (typeof claimed !== 'string') return null; return { raw: claimed, envelope: this.parseEnvelope(claimed) }; }
    async acknowledge(lease: QueueLease): Promise<void> { await redisCommand(this.redisUrl, ['LREM', this.processingKey, '1', lease.raw]); }
    async retry(lease: QueueLease, error: string, maxRetries: number): Promise<void> { await this.acknowledge(lease); const next = { ...lease.envelope, attempts: lease.envelope.attempts + 1, claimed_at: 0, available_at: Date.now() + 1000 * 2 ** lease.envelope.attempts, last_error: error }; const serialized = JSON.stringify(next); if (next.attempts >= maxRetries) await redisCommand(this.redisUrl, ['LPUSH', this.deadLetterKey, serialized]); else await redisCommand(this.redisUrl, ['ZADD', this.retryKey, String(next.available_at), serialized]); }
    async recoverStale(leaseSeconds: number, maxRetries: number): Promise<void> { const entries = await redisCommand(this.redisUrl, ['LRANGE', this.processingKey, '0', '-1']); if (!Array.isArray(entries)) return; for (const raw of entries) if (typeof raw === 'string') { const envelope = this.parseEnvelope(raw); if (envelope.claimed_at > 0 && Date.now() - envelope.claimed_at >= leaseSeconds * 1000) await this.retry({ raw, envelope }, 'worker lease expired', maxRetries); } }
    private async promoteRetries(): Promise<void> { const due = await redisCommand(this.redisUrl, ['ZRANGEBYSCORE', this.retryKey, '-inf', String(Date.now())]); if (!Array.isArray(due)) return; for (const raw of due) if (typeof raw === 'string') { await redisCommand(this.redisUrl, ['ZREM', this.retryKey, raw]); await redisCommand(this.redisUrl, ['LPUSH', this.queueKey, raw]); } }
    private parseEnvelope(raw: string): QueueEnvelope { const parsed = JSON.parse(raw) as Partial<QueueEnvelope>; if (parsed.job && typeof parsed.attempts === 'number') return parsed as QueueEnvelope; return this.envelope(parsed as ProcessingJob); }
    private envelope(job: ProcessingJob): QueueEnvelope { return { job: { ...job, job_id: job.job_id || randomUUID() }, attempts: 0, claimed_at: 0, available_at: Date.now() }; }
}

export type JsonQueueEnvelope<T> = { job: T; claimed_at: number };
export type JsonQueueLease<T> = { raw: string; envelope: JsonQueueEnvelope<T> };

export interface JsonJobQueue<T> {
    enqueue(job: T): Promise<void>;
    depth(): Promise<number>;
    removeQueued(predicate: (job: T) => boolean): Promise<number>;
}

export class RedisJsonQueue<T> {
    private readonly processingKey: string;
    constructor(private readonly redisUrl: string, private readonly queueKey: string) { this.processingKey = `${queueKey}:processing`; }
    async enqueue(job: T): Promise<void> { await redisCommand(this.redisUrl, ['LPUSH', this.queueKey, JSON.stringify({ job, claimed_at: 0 })]); }
    async claim(): Promise<JsonQueueLease<T> | null> {
        const claimed = await redisCommand(this.redisUrl, ['EVAL', "local raw=redis.call('RPOP',KEYS[1]); if not raw then return nil end; local value=cjson.decode(raw); value.claimed_at=tonumber(ARGV[1]); local result=cjson.encode(value); redis.call('LPUSH',KEYS[2],result); return result", '2', this.queueKey, this.processingKey, String(Date.now())]);
        if (typeof claimed !== 'string') return null;
        return { raw: claimed, envelope: JSON.parse(claimed) as JsonQueueEnvelope<T> };
    }
    async acknowledge(lease: JsonQueueLease<T>): Promise<void> { await redisCommand(this.redisUrl, ['LREM', this.processingKey, '1', lease.raw]); }
    async depth(): Promise<number> {
        const [queued, processing] = await Promise.all([
            redisCommand(this.redisUrl, ['LLEN', this.queueKey]),
            redisCommand(this.redisUrl, ['LLEN', this.processingKey]),
        ]);
        return Number(queued || 0) + Number(processing || 0);
    }
    async removeQueued(predicate: (job: T) => boolean): Promise<number> {
        const entries = await redisCommand(this.redisUrl, ['LRANGE', this.queueKey, '0', '-1']);
        if (!Array.isArray(entries)) return 0;
        let removed = 0;
        for (const raw of entries) if (typeof raw === 'string') {
            const envelope = JSON.parse(raw) as JsonQueueEnvelope<T>;
            if (predicate(envelope.job)) removed += Number(await redisCommand(this.redisUrl, ['LREM', this.queueKey, '0', raw]) || 0);
        }
        return removed;
    }
    async recoverStale(maxAgeSeconds: number): Promise<T[]> {
        const recovered: T[] = [];
        const entries = await redisCommand(this.redisUrl, ['LRANGE', this.processingKey, '0', '-1']);
        if (!Array.isArray(entries)) return recovered;
        for (const raw of entries) if (typeof raw === 'string') {
            const envelope = JSON.parse(raw) as JsonQueueEnvelope<T>;
            if (envelope.claimed_at > 0 && Date.now() - envelope.claimed_at >= maxAgeSeconds * 1000) {
                await redisCommand(this.redisUrl, ['LREM', this.processingKey, '1', raw]);
                recovered.push(envelope.job);
            }
        }
        return recovered;
    }
}

export type FencedQueueEnvelope<T> = {
    version: 3;
    job: T;
    attempt: number;
    available_at: number;
    claimed_at: number;
    lease_expires_at: number;
    worker_id: string;
    lease_token: string;
    last_error?: string;
};

export type FencedQueueLease<T> = {
    envelope: FencedQueueEnvelope<T>;
    jobId: string;
    workerId: string;
    token: string;
};
export type RecoveredFencedJob<T> = { job: T; leaseToken: string };

/**
 * AI-only queue protocol. Processing entries are keyed by job id and guarded
 * by an unguessable lease token. Every mutating operation checks the token in
 * Redis, so an expired worker cannot acknowledge, requeue, or publish for a
 * lease that has already been recovered by another worker.
 */
export class FencedRedisJsonQueue<T extends { job_id: string }> implements JsonJobQueue<T> {
    private readonly processingHash: string;
    private readonly expiryIndex: string;
    private readonly legacyProcessingKey: string;
    private readonly globalLock: string;
    constructor(private readonly redisUrl: string, private readonly queueKey: string) {
        this.processingHash = `${queueKey}:processing:v3`;
        this.expiryIndex = `${queueKey}:leases:v3`;
        this.legacyProcessingKey = `${queueKey}:processing`;
        this.globalLock = `${queueKey}:active:v3`;
    }

    async enqueue(job: T): Promise<void> {
        this.assertJobId(job.job_id);
        const script = "if redis.call('LLEN',KEYS[1])+redis.call('HLEN',KEYS[2])+redis.call('LLEN',KEYS[3])>0 then return 0 end; redis.call('LPUSH',KEYS[1],ARGV[1]); return 1";
        const inserted = Number(await redisCommand(this.redisUrl, ['EVAL', script, '3', this.queueKey, this.processingHash, this.legacyProcessingKey, JSON.stringify({ version: 3, job, attempt: 0, available_at: Date.now() })]));
        if (inserted !== 1) throw new Error('AI enhancement capacity is full.');
    }

    async claim(workerId: string, leaseSeconds: number): Promise<FencedQueueLease<T> | null> {
        const now = Date.now(); const token = randomUUID(); const expires = now + leaseSeconds * 1000;
        const script = "if redis.call('HLEN',KEYS[2])>0 then return nil end; if not redis.call('SET',KEYS[4],ARGV[4],'NX','PX',ARGV[5]) then return nil end; for i=1,64 do local raw=redis.call('RPOP',KEYS[1]); if not raw then if redis.call('GET',KEYS[4])==ARGV[4] then redis.call('DEL',KEYS[4]) end; return nil end; local env=cjson.decode(raw); local id=env.job and env.job.job_id; if type(id)=='string' and redis.call('HEXISTS',KEYS[2],id)==0 then env.version=3; env.attempt=tonumber(env.attempt or 0); env.available_at=tonumber(env.available_at or 0); env.claimed_at=tonumber(ARGV[1]); env.lease_expires_at=tonumber(ARGV[2]); env.worker_id=ARGV[3]; env.lease_token=ARGV[4]; local encoded=cjson.encode(env); redis.call('HSET',KEYS[2],id,encoded); redis.call('ZADD',KEYS[3],ARGV[2],id); return encoded end end; if redis.call('GET',KEYS[4])==ARGV[4] then redis.call('DEL',KEYS[4]) end; return redis.error_reply('AI queue contains too many duplicate entries')";
        const claimed = await redisCommand(this.redisUrl, ['EVAL', script, '4', this.queueKey, this.processingHash, this.expiryIndex, this.globalLock, String(now), String(expires), workerId, token, String(leaseSeconds * 1000)]);
        if (typeof claimed !== 'string') return null;
        const envelope = JSON.parse(claimed) as FencedQueueEnvelope<T>;
        this.assertJobId(envelope.job.job_id);
        return { envelope, jobId: envelope.job.job_id, workerId, token };
    }

    async renew(lease: FencedQueueLease<T>, leaseSeconds: number): Promise<boolean> {
        const now = Date.now(); const expires = now + leaseSeconds * 1000;
        const script = "if redis.call('GET',KEYS[3])~=ARGV[2] then return 0 end; local raw=redis.call('HGET',KEYS[1],ARGV[1]); if not raw then return 0 end; local env=cjson.decode(raw); if env.lease_token~=ARGV[2] or env.worker_id~=ARGV[3] or tonumber(env.lease_expires_at or 0)<=tonumber(ARGV[6]) then return 0 end; env.lease_expires_at=tonumber(ARGV[4]); local encoded=cjson.encode(env); redis.call('HSET',KEYS[1],ARGV[1],encoded); redis.call('ZADD',KEYS[2],ARGV[4],ARGV[1]); redis.call('PEXPIRE',KEYS[3],ARGV[5]); return 1";
        return Number(await redisCommand(this.redisUrl, ['EVAL', script, '3', this.processingHash, this.expiryIndex, this.globalLock, lease.jobId, lease.token, lease.workerId, String(expires), String(leaseSeconds * 1000), String(now)])) === 1;
    }

    async owns(lease: FencedQueueLease<T>): Promise<boolean> {
        const script = "if redis.call('GET',KEYS[2])~=ARGV[2] then return 0 end; local raw=redis.call('HGET',KEYS[1],ARGV[1]); if not raw then return 0 end; local env=cjson.decode(raw); if env.lease_token==ARGV[2] and env.worker_id==ARGV[3] and tonumber(env.lease_expires_at)>tonumber(ARGV[4]) then return 1 end; return 0";
        return Number(await redisCommand(this.redisUrl, ['EVAL', script, '2', this.processingHash, this.globalLock, lease.jobId, lease.token, lease.workerId, String(Date.now())])) === 1;
    }

    async acknowledge(lease: FencedQueueLease<T>): Promise<boolean> {
        const script = "if redis.call('GET',KEYS[3])~=ARGV[2] then return 0 end; local raw=redis.call('HGET',KEYS[1],ARGV[1]); if not raw then return 0 end; local env=cjson.decode(raw); if env.lease_token~=ARGV[2] or env.worker_id~=ARGV[3] or tonumber(env.lease_expires_at or 0)<=tonumber(ARGV[4]) then return 0 end; redis.call('HDEL',KEYS[1],ARGV[1]); redis.call('ZREM',KEYS[2],ARGV[1]); redis.call('DEL',KEYS[3]); return 1";
        return Number(await redisCommand(this.redisUrl, ['EVAL', script, '3', this.processingHash, this.expiryIndex, this.globalLock, lease.jobId, lease.token, lease.workerId, String(Date.now())])) === 1;
    }

    async requeue(lease: FencedQueueLease<T>, reason: string): Promise<boolean> {
        const script = "if redis.call('GET',KEYS[4])~=ARGV[2] then return 0 end; local raw=redis.call('HGET',KEYS[1],ARGV[1]); if not raw then return 0 end; local env=cjson.decode(raw); if env.lease_token~=ARGV[2] or env.worker_id~=ARGV[3] or tonumber(env.lease_expires_at or 0)<=tonumber(ARGV[6]) then return 0 end; redis.call('HDEL',KEYS[1],ARGV[1]); redis.call('ZREM',KEYS[2],ARGV[1]); redis.call('DEL',KEYS[4]); env.claimed_at=nil; env.lease_expires_at=nil; env.worker_id=nil; env.lease_token=nil; env.available_at=tonumber(ARGV[5]); env.last_error=ARGV[4]; redis.call('LPUSH',KEYS[3],cjson.encode(env)); return 1";
        return Number(await redisCommand(this.redisUrl, ['EVAL', script, '4', this.processingHash, this.expiryIndex, this.queueKey, this.globalLock, lease.jobId, lease.token, lease.workerId, reason.slice(0, 500), String(Date.now()), String(Date.now())])) === 1;
    }

    async recoverExpired(maxAttempts: number): Promise<{ requeued: RecoveredFencedJob<T>[]; exhausted: RecoveredFencedJob<T>[] }> {
        const ids = await redisCommand(this.redisUrl, ['ZRANGEBYSCORE', this.expiryIndex, '-inf', String(Date.now())]);
        const result: { requeued: RecoveredFencedJob<T>[]; exhausted: RecoveredFencedJob<T>[] } = { requeued: [], exhausted: [] };
        if (!Array.isArray(ids)) return result;
        const script = "local raw=redis.call('HGET',KEYS[1],ARGV[1]); if not raw then redis.call('ZREM',KEYS[2],ARGV[1]); return nil end; local env=cjson.decode(raw); if tonumber(env.lease_expires_at or 0)>tonumber(ARGV[2]) then return nil end; local token=env.lease_token; redis.call('HDEL',KEYS[1],ARGV[1]); redis.call('ZREM',KEYS[2],ARGV[1]); if redis.call('GET',KEYS[4])==token then redis.call('DEL',KEYS[4]) end; env.attempt=tonumber(env.attempt or 0)+1; local recovered=cjson.encode({job=env.job,lease_token=token}); if env.attempt>=tonumber(ARGV[3]) then return 'exhausted:'..recovered end; env.claimed_at=nil; env.lease_expires_at=nil; env.worker_id=nil; env.lease_token=nil; env.available_at=tonumber(ARGV[2]); env.last_error='worker lease expired'; redis.call('LPUSH',KEYS[3],cjson.encode(env)); return 'requeued:'..recovered";
        for (const id of ids) if (typeof id === 'string') {
            const recovered = await redisCommand(this.redisUrl, ['EVAL', script, '4', this.processingHash, this.expiryIndex, this.queueKey, this.globalLock, id, String(Date.now()), String(maxAttempts)]);
            if (typeof recovered !== 'string') continue;
            const separator = recovered.indexOf(':'); if (separator < 0) continue;
            const value = JSON.parse(recovered.slice(separator + 1)) as { job: T; lease_token: string };
            (recovered.startsWith('exhausted:') ? result.exhausted : result.requeued).push({ job: value.job, leaseToken: value.lease_token });
        }
        return result;
    }

    async assertLegacyProcessingEmpty(): Promise<void> {
        const count = Number(await redisCommand(this.redisUrl, ['LLEN', this.legacyProcessingKey]) || 0);
        if (count > 0) throw new Error('Legacy AI processing entries must be drained by the previous worker before V3 starts.');
    }

    async depth(): Promise<number> {
        const [queued, processing, legacy] = await Promise.all([
            redisCommand(this.redisUrl, ['LLEN', this.queueKey]),
            redisCommand(this.redisUrl, ['HLEN', this.processingHash]),
            redisCommand(this.redisUrl, ['LLEN', this.legacyProcessingKey]),
        ]);
        return Number(queued || 0) + Number(processing || 0) + Number(legacy || 0);
    }

    async removeQueued(predicate: (job: T) => boolean): Promise<number> {
        const entries = await redisCommand(this.redisUrl, ['LRANGE', this.queueKey, '0', '-1']);
        if (!Array.isArray(entries)) return 0;
        let removed = 0;
        for (const raw of entries) if (typeof raw === 'string') {
            const envelope = JSON.parse(raw) as { job: T };
            if (envelope.job && predicate(envelope.job)) removed += Number(await redisCommand(this.redisUrl, ['LREM', this.queueKey, '0', raw]) || 0);
        }
        return removed;
    }

    private assertJobId(value: string): void {
        if (!/^[a-f0-9-]{36}$/i.test(value)) throw new Error('Unsafe fenced queue job identifier.');
    }
}
