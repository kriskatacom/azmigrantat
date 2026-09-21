import assert from 'node:assert/strict';
import test from 'node:test';

import { createHeartbeatPayload } from '../src/registry/media-node-registry';

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
