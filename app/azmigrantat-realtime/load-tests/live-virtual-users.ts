import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';

type AuthResponse = { access_token: string; user?: { id?: number } };
type LiveResponse = { data: { id: number; status: string } };

const apiUrl = required('LOAD_API_URL').replace(/\/+$/, '');
const socketUrl = required('LOAD_SOCKET_URL').replace(/\/+$/, '');
const clientId = required('LOAD_CLIENT_ID');
const viewerCount = Number(process.env.LOAD_VIEWERS ?? '10');
const holdSeconds = Number(process.env.LOAD_HOLD_SECONDS ?? '30');
const password = process.env.LOAD_PASSWORD ?? 'LoadTest-Only-2026!';

if (!Number.isInteger(viewerCount) || viewerCount < 1 || viewerCount > 200) {
  throw new Error('LOAD_VIEWERS must be an integer from 1 to 200.');
}

type TestUser = { email: string; password: string; token: string; userId?: number };

async function main(): Promise<void> {
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const users = await Promise.all(
    Array.from({ length: viewerCount + 1 }, (_, index) =>
      registerUser(runId, index === 0 ? 'owner' : `viewer-${index}`),
    ),
  );

  const owner = users[0];
  const viewers = users.slice(1);
  console.log(JSON.stringify({ event: 'users-created', owner: owner.userId, viewers: viewers.length }));

  let liveId: number | null = null;
  const sockets: Socket[] = [];

  try {
    const created = await api<LiveResponse>('/api/mobile/lives', owner.token, {
      method: 'POST',
      body: JSON.stringify({ title: `Load test ${runId}` }),
    });
    liveId = created.data.id;
    await api(`/api/mobile/lives/${liveId}/start`, owner.token, { method: 'POST' });
    console.log(JSON.stringify({ event: 'live-started', liveId, viewers: viewers.length }));

    await Promise.all(
      viewers.map((viewer) => api(`/api/mobile/lives/${liveId}/join`, viewer.token, { method: 'POST' })),
    );
    console.log(JSON.stringify({ event: 'api-viewers-joined', liveId, viewers: viewers.length }));

    const socketResults = await Promise.all(
      users.map((user) => connectViewer(user.token, liveId as number, sockets)),
    );
    const connected = socketResults.filter(Boolean).length;
    console.log(JSON.stringify({ event: 'sockets-connected', liveId, connected, expected: users.length }));

    await sleep(holdSeconds * 1000);
  } finally {
    for (const socket of sockets) socket.disconnect();
    if (liveId !== null) {
      await api(`/api/mobile/lives/${liveId}/end`, owner.token, { method: 'POST' }).catch((error) => {
        console.error('[load-test] live cleanup failed:', error instanceof Error ? error.message : error);
      });
    }
  }
}

async function registerUser(runId: string, label: string): Promise<TestUser> {
  const email = `loadtest-${runId}-${label}@example.invalid`;
  const response = await fetch(`${apiUrl}/api/mobile/register`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      firstName: 'LoadTest',
      lastName: label,
      email,
      password,
      passwordConfirmation: password,
      device_uuid: `loadtest-${runId}-${label}`,
      device_name: 'Automated load test',
      platform: 'android',
    }),
  });
  const payload = (await response.json()) as Partial<AuthResponse> & { message?: string };
  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new Error(`Registration failed for ${label}: HTTP ${response.status} ${payload.message ?? ''}`);
  }
  return { email, password, token: payload.access_token, userId: payload.user?.id };
}

async function connectViewer(token: string, liveId: number, sockets: Socket[]): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = io(socketUrl, { auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    const timer = setTimeout(() => {
      socket.disconnect();
      resolve(false);
    }, 10_000);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.emit('live:join', { live_id: liveId });
      resolve(true);
    });
    socket.once('connect_error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

async function api<T = unknown>(path: string, token: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  const body = await response.text();
  let payload = {} as T & { message?: string };
  if (body.trim() !== '') {
    try {
      payload = JSON.parse(body) as T & { message?: string };
    } catch {
      throw new Error(`${path}: HTTP ${response.status} returned non-JSON response.`);
    }
  }
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${payload.message ?? ''}`);
  return payload;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void main().catch((error: unknown) => {
  console.error('[load-test] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
