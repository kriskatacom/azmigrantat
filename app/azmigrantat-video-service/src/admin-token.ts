import { createHmac, timingSafeEqual } from 'node:crypto';
import type { DeleteTokenClaims, EnhancementTokenClaims } from './types';

function encode(value: unknown): string { return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url'); }
function decode<T>(value: string): T { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T; }
function sign(input: string, secret: string): string { return createHmac('sha256', secret).update(input).digest('base64url'); }

export function issueDeleteToken(claims: DeleteTokenClaims, secret: string): string {
    const header = encode({ alg: 'HS256', typ: 'AZM_ADMIN' });
    const payload = encode(claims);
    return `${header}.${payload}.${sign(`${header}.${payload}`, secret)}`;
}

export function verifyDeleteToken(token: string, secret: string, expectedUploadId: string, now = Math.floor(Date.now() / 1000)): DeleteTokenClaims {
    const claims = verifyAdminToken<DeleteTokenClaims>(token, secret);
    if (claims.action !== 'delete' || claims.provider !== 'oneprovider' || claims.upload_id !== expectedUploadId || !validIdentityClaims(claims, now)) throw new Error('Delete token claims are invalid or expired.');
    return claims;
}

export function verifyEnhancementToken(token: string, secret: string, now = Math.floor(Date.now() / 1000)): EnhancementTokenClaims {
    const claims = verifyAdminToken<EnhancementTokenClaims>(token, secret);
    if (claims.action !== 'enhancement' || claims.provider !== 'oneprovider' || typeof claims.ai_allowed !== 'boolean' || !validIdentityClaims(claims, now)) throw new Error('Enhancement token claims are invalid or expired.');
    return claims;
}

function verifyAdminToken<T>(token: string, secret: string): T {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid administrative token.');
    const actual = Buffer.from(parts[2]); const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`, secret));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid administrative token signature.');
    let header: { alg?: string; typ?: string };
    try { header = decode<{ alg?: string; typ?: string }>(parts[0]); } catch { throw new Error('Invalid administrative token header.'); }
    if (header.alg !== 'HS256' || header.typ !== 'AZM_ADMIN') throw new Error('Invalid administrative token header.');
    try { return decode<T>(parts[1]); } catch { throw new Error('Invalid administrative token payload.'); }
}

function validIdentityClaims(claims: { upload_id: string; user_id: number; video_id: number; exp: number }, now: number): boolean {
    return /^[a-f0-9-]{36}$/i.test(claims.upload_id)
        && Number.isSafeInteger(claims.user_id) && claims.user_id > 0
        && Number.isSafeInteger(claims.video_id) && claims.video_id > 0
        && Number.isSafeInteger(claims.exp) && claims.exp > now;
}
