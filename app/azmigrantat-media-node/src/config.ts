import 'dotenv/config';

function positiveInteger(name: string, fallback: string): number {
  const rawValue = process.env[name] ?? fallback;
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0 || value > 65535) {
    throw new Error(`Невалидна стойност за ${name}: ${rawValue}`);
  }

  return value;
}

function required(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback;

  if (!value) {
    throw new Error(`Липсва задължителната environment променлива: ${name}`);
  }

  return value;
}

function durationMs(name: string, fallback: string): number {
  const rawValue = process.env[name] ?? fallback;
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < 1_000) {
    throw new Error(`Невалидна стойност за ${name}: ${rawValue}`);
  }

  return value;
}

export const config = {
  nodeId: required('MEDIA_NODE_ID', 'media-node-1'),
  host: required('MEDIA_NODE_HOST', '0.0.0.0'),
  port: positiveInteger('MEDIA_NODE_PORT', '3002'),
  advertisedHost: required('MEDIA_NODE_ADVERTISED_HOST', 'localhost'),
  controlHost: required('MEDIA_NODE_CONTROL_HOST', process.env.MEDIA_NODE_ADVERTISED_HOST?.trim() || 'localhost'),
  internalSecret: required('MEDIA_NODE_INTERNAL_SECRET', 'local-media-node-secret'),
  rtcMinPort: positiveInteger('MEDIASOUP_MIN_PORT', '40000'),
  rtcMaxPort: positiveInteger('MEDIASOUP_MAX_PORT', '40099'),
  redisUrl: required('REDIS_URL', 'redis://127.0.0.1:6379'),
  heartbeatIntervalMs: durationMs('MEDIA_NODE_HEARTBEAT_INTERVAL_MS', '5000'),
};

if (config.rtcMaxPort < config.rtcMinPort) {
  throw new Error('MEDIASOUP_MAX_PORT трябва да е по-голямо или равно на MEDIASOUP_MIN_PORT.');
}
