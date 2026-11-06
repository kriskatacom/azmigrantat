import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { decodeUploadToken, issueUploadToken, verifyUploadToken } from '../src/token';

const secret = 'unit-test-video-upload-secret';
const claims = { upload_id: randomUUID(), user_id: 7, video_id: 9, exp: Math.floor(Date.now() / 1000) + 300, max_size: 1024, mime_type: 'video/mp4' };

test('token unit contract validates signature, expiry, and owner binding', () => {
    const token = issueUploadToken(claims, secret);
    assert.deepEqual(decodeUploadToken(token, secret), claims);
    assert.equal(verifyUploadToken(token, secret, { uploadId: claims.upload_id, userId: claims.user_id }).video_id, 9);
    assert.throws(() => verifyUploadToken(token, secret, { uploadId: claims.upload_id, userId: 8 }), /does not match/);
    assert.throws(() => decodeUploadToken(`${token.slice(0, -1)}x`, secret), /signature/);
    assert.throws(() => decodeUploadToken(issueUploadToken({ ...claims, exp: 1 }, secret), secret), /expired/);
});
