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

export const config = {
    port,
    phpApiUrl: requireEnvironmentVariable('PHP_API_URL').replace(/\/+$/, ''),
    internalApiSecret: requireEnvironmentVariable('INTERNAL_API_SECRET'),
};
