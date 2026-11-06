import { createHmac, timingSafeEqual } from 'node:crypto';
import type { DeleteTokenClaims } from './types';

function encode(value: unknown): string { return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url'); }
function decode<T>(value: string): T { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T; }
function sign(input: string, secret: string): string { return createHmac('sha256', secret).update(input).digest('base64url'); }

export function issueDeleteToken(claims: DeleteTokenClaims, secret: string): string {
    const header = encode({ alg: 'HS256', typ: 'AZM_ADMIN' });
    const payload = encode(claims);
    return `${header}.${payload}.${sign(`${header}.${payload}`, secret)}`;
}

export function verifyDeleteToken(token: string, secret: string, expectedUploadId: string, now = Math.floor(Date.now() / 1000)): DeleteTokenClaims {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid delete token.');
    const actual = Buffer.from(parts[2]); const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`, secret));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid delete token signature.');
    let header: { alg?: string; typ?: string };
    try { header = decode<{ alg?: string; typ?: string }>(parts[0]); } catch { throw new Error('Invalid delete token header.'); }
    if (header.alg !== 'HS256' || header.typ !== 'AZM_ADMIN') throw new Error('Invalid delete token header.');
    let claims: DeleteTokenClaims;
    try { claims = decode<DeleteTokenClaims>(parts[1]); } catch { throw new Error('Invalid delete token payload.'); }
    if (claims.action !== 'delete' || claims.provider !== 'oneprovider' || claims.upload_id !== expectedUploadId || !/^[a-f0-9-]{36}$/i.test(claims.upload_id) || !Number.isSafeInteger(claims.user_id) || claims.user_id < 1 || !Number.isSafeInteger(claims.video_id) || claims.video_id < 1 || !Number.isSafeInteger(claims.exp) || claims.exp <= now) throw new Error('Delete token claims are invalid or expired.');
    return claims;
}
