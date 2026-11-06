import test from 'node:test';
import assert from 'node:assert/strict';
import { redisTarget } from '../src/queue';

test('Redis URL preserves ACL username and decodes credentials', () => {
    assert.deepEqual(redisTarget('redis://staging%2Dworker:p%40ss%3Aword@127.0.0.1:6380'), {
        host: '127.0.0.1', port: 6380, username: 'staging-worker', password: 'p@ss:word',
    });
});

test('Redis URL without credentials remains supported for existing Bunny/default deployments', () => {
    assert.deepEqual(redisTarget('redis://127.0.0.1:6379'), {
        host: '127.0.0.1', port: 6379, username: undefined, password: undefined,
    });
});
