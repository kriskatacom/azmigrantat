import 'dotenv/config';

function requireEnvironmentVariable(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Липсва задължителната environment променлива: ${name}`);
    }

    return value;
}

const rawPort = process.env.PORT ?? '3001';
const port = Number(rawPort);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Невалидна стойност за PORT: ${rawPort}`);
}

const environment = process.env.APP_ENV?.trim() || 'development';
if (!['development', 'staging', 'production'].includes(environment)) {
    throw new Error(`Invalid APP_ENV: ${environment}`);
}
const phpApiUrl = requireEnvironmentVariable('PHP_API_URL').replace(/\/+$/, '');
const redisKeyPrefix = process.env.REDIS_KEY_PREFIX?.trim() || '';
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || '';
const fcmEnabled = process.env.FCM_ENABLED === 'true';

if (environment === 'staging') {
    if (phpApiUrl !== 'https://users-staging.azmigrantat.com') {
        throw new Error('Staging realtime must use users-staging.azmigrantat.com over HTTPS.');
    }
    if (redisKeyPrefix !== 'azmigrantat:realtime:staging:') {
        throw new Error('Staging realtime requires the isolated staging REDIS_KEY_PREFIX.');
    }
    if (fcmEnabled) {
        throw new Error(
            'Staging FCM must remain disabled until its isolated Firebase project is provisioned.',
        );
    }
}

export const config = {
    environment,
    port,
    phpApiUrl,
    internalApiSecret: requireEnvironmentVariable('INTERNAL_API_SECRET'),
    redisUrl: process.env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379',
    redisKeyPrefix,
    mediaNodeInternalSecret:
        process.env.MEDIA_NODE_INTERNAL_SECRET?.trim() || 'local-media-node-secret',
    fcmEnabled,
    firebaseProjectId,
};
