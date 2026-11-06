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
async function redis(url: string, parts: string[]): Promise<string | number | null | Array<string | null>> {
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
    async enqueue(job: ProcessingJob): Promise<void> { await redis(this.redisUrl, ['LPUSH', this.queueKey, JSON.stringify(this.envelope(job))]); }
    async claim(): Promise<QueueLease | null> { await this.promoteRetries(); const raw = await redis(this.redisUrl, ['RPOPLPUSH', this.queueKey, this.processingKey]); if (typeof raw !== 'string') return null; const envelope = this.parseEnvelope(raw); envelope.claimed_at = Date.now(); const claimed = JSON.stringify(envelope); await redis(this.redisUrl, ['LREM', this.processingKey, '1', raw]); await redis(this.redisUrl, ['LPUSH', this.processingKey, claimed]); return { raw: claimed, envelope }; }
    async acknowledge(lease: QueueLease): Promise<void> { await redis(this.redisUrl, ['LREM', this.processingKey, '1', lease.raw]); }
    async retry(lease: QueueLease, error: string, maxRetries: number): Promise<void> { await this.acknowledge(lease); const next = { ...lease.envelope, attempts: lease.envelope.attempts + 1, claimed_at: 0, available_at: Date.now() + 1000 * 2 ** lease.envelope.attempts, last_error: error }; const serialized = JSON.stringify(next); if (next.attempts >= maxRetries) await redis(this.redisUrl, ['LPUSH', this.deadLetterKey, serialized]); else await redis(this.redisUrl, ['ZADD', this.retryKey, String(next.available_at), serialized]); }
    async recoverStale(leaseSeconds: number, maxRetries: number): Promise<void> { const entries = await redis(this.redisUrl, ['LRANGE', this.processingKey, '0', '-1']); if (!Array.isArray(entries)) return; for (const raw of entries) if (typeof raw === 'string') { const envelope = this.parseEnvelope(raw); if (envelope.claimed_at > 0 && Date.now() - envelope.claimed_at >= leaseSeconds * 1000) await this.retry({ raw, envelope }, 'worker lease expired', maxRetries); } }
    private async promoteRetries(): Promise<void> { const due = await redis(this.redisUrl, ['ZRANGEBYSCORE', this.retryKey, '-inf', String(Date.now())]); if (!Array.isArray(due)) return; for (const raw of due) if (typeof raw === 'string') { await redis(this.redisUrl, ['ZREM', this.retryKey, raw]); await redis(this.redisUrl, ['LPUSH', this.queueKey, raw]); } }
    private parseEnvelope(raw: string): QueueEnvelope { const parsed = JSON.parse(raw) as Partial<QueueEnvelope>; if (parsed.job && typeof parsed.attempts === 'number') return parsed as QueueEnvelope; return this.envelope(parsed as ProcessingJob); }
    private envelope(job: ProcessingJob): QueueEnvelope { return { job: { ...job, job_id: job.job_id || randomUUID() }, attempts: 0, claimed_at: 0, available_at: Date.now() }; }
}
