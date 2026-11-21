import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { GpuCapabilityClaims, GpuCapabilityOperation } from './contracts';

const UUID = /^[a-f0-9-]{36}$/i;

function encoded(value: string | Buffer): string { return Buffer.from(value).toString('base64url'); }
function signature(payload: string, secret: string): string { return createHmac('sha256', secret).update(payload).digest('base64url'); }
function requireSecret(secret: string): void { if (secret.length < 32) throw new Error('GPU signing secret is not configured.'); }

export function signGpuCapability(input: Omit<GpuCapabilityClaims, 'version' | 'audience' | 'nonce' | 'issued_at' | 'expires_at'>, secret: string, ttlSeconds: number, now = Date.now()): string {
    requireSecret(secret);
    if (!UUID.test(input.job_id) || !UUID.test(input.lease_token) || !UUID.test(input.worker_id)) throw new Error('Invalid GPU capability identifier.');
    const maximumTtl = input.operation === 'bootstrap' ? 14_400 : 900;
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > maximumTtl) throw new Error('Invalid GPU capability lifetime.');
    const claims: GpuCapabilityClaims = {
        version: 1,
        audience: 'azmigrantat-gpu-worker',
        ...input,
        nonce: randomUUID(),
        issued_at: Math.floor(now / 1000),
        expires_at: Math.floor(now / 1000) + ttlSeconds,
    };
    const payload = encoded(JSON.stringify(claims));
    return `${payload}.${signature(payload, secret)}`;
}

export function verifyGpuCapability(token: string, secret: string, expectedOperation: GpuCapabilityOperation, now = Date.now()): GpuCapabilityClaims {
    requireSecret(secret);
    const [payload, supplied, extra] = token.split('.');
    if (!payload || !supplied || extra) throw new Error('Malformed GPU capability.');
    const expected = signature(payload, secret);
    const suppliedBytes = Buffer.from(supplied); const expectedBytes = Buffer.from(expected);
    if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) throw new Error('Invalid GPU capability signature.');
    let claims: GpuCapabilityClaims;
    try { claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as GpuCapabilityClaims; }
    catch { throw new Error('Invalid GPU capability payload.'); }
    const seconds = Math.floor(now / 1000);
    if (claims.version !== 1 || claims.audience !== 'azmigrantat-gpu-worker' || claims.operation !== expectedOperation
        || !UUID.test(claims.job_id) || !UUID.test(claims.lease_token) || !UUID.test(claims.worker_id) || !UUID.test(claims.nonce)
        || !Number.isSafeInteger(claims.issued_at) || !Number.isSafeInteger(claims.expires_at)
        || claims.issued_at > seconds + 30 || claims.expires_at <= seconds
        || claims.expires_at - claims.issued_at > (expectedOperation === 'bootstrap' ? 14_400 : 900)) throw new Error('Expired or invalid GPU capability claims.');
    return claims;
}

export type SignedWorkerRequest = { timestamp: number; nonce: string; signature: string };

export function signWorkerRequest(method: string, path: string, body: Buffer, secret: string, now = Date.now(), nonce: string = randomUUID()): SignedWorkerRequest {
    requireSecret(secret);
    const timestamp = Math.floor(now / 1000);
    const bodyHash = createHash('sha256').update(body).digest('hex');
    const canonical = `${method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
    return { timestamp, nonce, signature: createHmac('sha256', secret).update(canonical).digest('hex') };
}

export function verifyWorkerRequest(method: string, path: string, body: Buffer, signed: SignedWorkerRequest, secret: string, now = Date.now()): void {
    requireSecret(secret);
    const seconds = Math.floor(now / 1000);
    if (!UUID.test(signed.nonce) || !Number.isSafeInteger(signed.timestamp) || Math.abs(seconds - signed.timestamp) > 60 || !/^[a-f0-9]{64}$/.test(signed.signature)) throw new Error('Invalid GPU worker request metadata.');
    const expected = signWorkerRequest(method, path, body, secret, signed.timestamp * 1000, signed.nonce).signature;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signed.signature))) throw new Error('Invalid GPU worker request signature.');
}
