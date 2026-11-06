import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createHeartbeatPayload,
  mediaNodeRegistryKey,
} from '../src/registry/media-node-registry';
import { validateStagingIsolation } from '../src/config';

test('heartbeat payload keeps signaling, RTC and control addresses separate', () => {
  const payload = createHeartbeatPayload({
    state: 'ready',
    worker_pid: 123,
    router_id: 'router-1',
  });

  assert.equal(payload.signaling_url, 'http://localhost:3002');
  assert.equal(payload.advertised_host, 'localhost');
  assert.equal(payload.control_host, 'localhost');
  assert.equal(payload.control_port, 3002);
  assert.equal(payload.rtc_min_port, 40000);
  assert.equal(payload.rtc_max_port, 40099);
});

test('registry keys are isolated by the configured environment prefix', () => {
  assert.equal(
    mediaNodeRegistryKey('media-node-1', 'azmigrantat:realtime:staging:'),
    'azmigrantat:realtime:staging:media:nodes:media-node-1',
  );
  assert.notEqual(
    mediaNodeRegistryKey('media-node-1', 'azmigrantat:realtime:staging:'),
    mediaNodeRegistryKey('media-node-1', 'azmigrantat:realtime:production:'),
  );
});

test('staging media node rejects production Redis and signaling configuration', () => {
  assert.deepEqual(
    validateStagingIsolation(
      'staging',
      'azmigrantat:realtime:production:',
      'https://live.azmigrantat.com',
    ).length,
    2,
  );
  assert.deepEqual(
    validateStagingIsolation(
      'staging',
      'azmigrantat:realtime:staging:',
      'https://live-staging.azmigrantat.com',
    ),
    [],
  );
  assert.deepEqual(
    validateStagingIsolation(
      'stage',
      'azmigrantat:realtime:staging:',
      'https://live-staging.azmigrantat.com',
    ),
    ['Invalid APP_ENV: stage.'],
  );
  assert.equal(
    validateStagingIsolation(
      'staging',
      'azmigrantat:realtime:staging:',
      'http://live-staging.azmigrantat.com',
    ).length,
    1,
  );
});
