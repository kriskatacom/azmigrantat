import { createHmac, timingSafeEqual } from 'node:crypto';
import type { UploadTokenClaims } from './types';

function encode(value: unknown): string { return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url'); }
function decode<T>(value: string): T { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T; }
function sign(input: string, secret: string): string { return createHmac('sha256', secret).update(input).digest('base64url'); }

export function issueUploadToken(claims: UploadTokenClaims, secret: string): string {
    const header = encode({ alg: 'HS256', typ: 'AZM_UPLOAD' });
    const payload = encode(claims);
    return `${header}.${payload}.${sign(`${header}.${payload}`, secret)}`;
}

export function decodeUploadToken(token: string, secret: string, now = Math.floor(Date.now() / 1000)): UploadTokenClaims {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid upload token.');
    const actual = Buffer.from(parts[2]);
    const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`, secret));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid upload token signature.');
    let claims: UploadTokenClaims;
    try { claims = decode<UploadTokenClaims>(parts[1]); } catch { throw new Error('Invalid upload token payload.'); }
    if (!/^[a-f0-9-]{36}$/i.test(claims.upload_id) || !Number.isSafeInteger(claims.user_id) || claims.user_id <= 0 || !Number.isSafeInteger(claims.video_id) || claims.video_id <= 0 || !Number.isSafeInteger(claims.max_size) || claims.max_size <= 0 || !Number.isSafeInteger(claims.exp) || claims.exp <= now || typeof claims.mime_type !== 'string' || claims.mime_type.trim() === '') throw new Error('Upload token claims are invalid or expired.');
    return claims;
}

export function verifyUploadToken(token: string, secret: string, expected: { uploadId: string; userId: number }, now?: number): UploadTokenClaims {
    const claims = decodeUploadToken(token, secret, now);
    if (claims.upload_id !== expected.uploadId || claims.user_id !== expected.userId) throw new Error('Upload token does not match this upload.');
    return claims;
}
