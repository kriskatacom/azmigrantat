import { randomUUID } from 'node:crypto';
import { redisCommand } from '../queue';

export type GpuSingletonLease = { key: string; token: string; ttlSeconds: number };

export async function acquireGpuSingleton(redisUrl: string, key: string, ttlSeconds = 60): Promise<GpuSingletonLease | null> {
    if (!key || ttlSeconds < 15 || ttlSeconds > 300) throw new Error('Invalid GPU singleton configuration.');
    const token = randomUUID();
    const result = await redisCommand(redisUrl, ['SET', key, token, 'NX', 'EX', String(ttlSeconds)]);
    return result === 'OK' ? { key, token, ttlSeconds } : null;
}

export async function renewGpuSingleton(redisUrl: string, lease: GpuSingletonLease): Promise<boolean> {
    const script = "if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('EXPIRE',KEYS[1],ARGV[2]); return 1 end; return 0";
    return Number(await redisCommand(redisUrl, ['EVAL', script, '1', lease.key, lease.token, String(lease.ttlSeconds)])) === 1;
}

export async function releaseGpuSingleton(redisUrl: string, lease: GpuSingletonLease): Promise<boolean> {
    const script = "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0";
    return Number(await redisCommand(redisUrl, ['EVAL', script, '1', lease.key, lease.token])) === 1;
}

export async function reserveWorkerRequestNonce(redisUrl: string, namespace: string, nonce: string, ttlSeconds = 120): Promise<boolean> {
    if (!/^[a-f0-9-]{36}$/i.test(nonce) || !/^[a-z0-9:_-]{3,120}$/i.test(namespace)) throw new Error('Invalid worker replay key.');
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 14_460) throw new Error('Invalid worker replay TTL.');
    const result = await redisCommand(redisUrl, ['SET', `${namespace}:nonce:${nonce}`, '1', 'NX', 'EX', String(ttlSeconds)]);
    return result === 'OK';
}

export function shouldReleaseIdleInstance(input: { activeJobs: number; queuedJobs: number; idleSince: number | null; now: number; idleTimeoutSeconds: number }): boolean {
    if (input.activeJobs > 0 || input.queuedJobs > 0 || input.idleSince === null) return false;
    return input.now - input.idleSince >= input.idleTimeoutSeconds * 1000;
}
