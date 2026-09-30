import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';

const realtimeUrl = required('LOAD_REALTIME_URL').replace(/\/+$/, '');
const signalingUrl = required('LOAD_SIGNALING_URL').replace(/\/+$/, '');
const internalSecret = required('LOAD_INTERNAL_SECRET');
const viewerCount = Number(process.env.LOAD_VIEWERS ?? '10');
const holdSeconds = Number(process.env.LOAD_HOLD_SECONDS ?? '20');
const liveId = 900_000 + (Date.now() % 99_999);
const roomId = `loadtest-sfu-${liveId}-${randomUUID().slice(0, 8)}`;

type Session = { session_id: string };
type Ack = { ok?: boolean; message?: string; transport?: { id?: string } };

if (!Number.isInteger(viewerCount) || viewerCount < 1 || viewerCount > 200) {
    throw new Error('LOAD_VIEWERS must be an integer from 1 to 200.');
}

async function main(): Promise<void> {
    const sockets: Socket[] = [];
    let allocated = false;

    try {
        await request('/internal/media/allocate', {
            live_id: liveId,
            media_room_id: roomId,
        });
        allocated = true;
        console.log(JSON.stringify({ event: 'assignment-created', liveId, roomId }));

        const roles = ['streamer', ...Array.from({ length: viewerCount }, () => 'viewer')];
        const sessions = await Promise.all(
            roles.map((role) =>
                request<{ session: Session }>('/internal/media/session', {
                    live_id: liveId,
                    role,
                }).then((response) => response.session),
            ),
        );
        console.log(JSON.stringify({ event: 'sessions-created', sessions: sessions.length }));

        const connected = await Promise.all(
            sessions.map((session, index) =>
                connectSession(session, index === 0 ? 'send' : 'recv', sockets),
            ),
        );
        console.log(
            JSON.stringify({
                event: 'transports-created',
                connected: connected.filter(Boolean).length,
                expected: sessions.length,
            }),
        );

        await sleep(holdSeconds * 1000);
    } finally {
        for (const socket of sockets) socket.disconnect();
        if (allocated) {
            await request('/internal/media/release', { live_id: liveId }).catch((error) => {
                console.error(
                    '[sfu-load] release failed:',
                    error instanceof Error ? error.message : error,
                );
            });
        }
    }
}

async function connectSession(
    session: Session,
    direction: 'send' | 'recv',
    sockets: Socket[],
): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = io(signalingUrl, {
            auth: { session_id: session.session_id },
            transports: ['websocket'],
            reconnection: false,
        });
        sockets.push(socket);
        const timer = setTimeout(() => {
            socket.disconnect();
            resolve(false);
        }, 10_000);
        socket.once('connect_error', () => {
            clearTimeout(timer);
            resolve(false);
        });
        socket.once('sfu:ready', () => {
            socket.emit('transport:create', { direction }, (response: Ack) => {
                clearTimeout(timer);
                if (!response?.ok || !response.transport?.id) {
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        });
    });
}

async function request<T = { success?: boolean }>(path: string, body: object): Promise<T> {
    const response = await fetch(`${realtimeUrl}${path}`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Internal-Secret': internalSecret,
        },
        body: JSON.stringify(body),
    });
    const payload = (await response.json()) as T & { message?: string };
    if (!response.ok) {
        throw new Error(`${path}: HTTP ${response.status} ${payload.message ?? ''}`);
    }
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
    console.error('[sfu-load] failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
