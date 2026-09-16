import { io } from 'socket.io-client';

const baseUrl = process.env.MEDIA_NODE_URL ?? 'http://127.0.0.1:3002';
const secret = process.env.MEDIA_NODE_INTERNAL_SECRET ?? 'local-media-node-secret';

async function main(): Promise<void> {
const response = await fetch(`${baseUrl}/v1/rooms/smoke-room/session`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Media-Node-Secret': secret,
  },
  body: JSON.stringify({ role: 'streamer' }),
});

if (!response.ok) {
  throw new Error(`Session creation failed with HTTP ${response.status}.`);
}

const payload = (await response.json()) as {
  session?: { session_id?: string };
};
const sessionId = payload.session?.session_id;

if (!sessionId) {
  throw new Error('Session response did not contain session_id.');
}

const socket = io(baseUrl, {
  auth: { session_id: sessionId },
  transports: ['websocket'],
  reconnection: false,
});

await new Promise<void>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Timed out waiting for SFU signaling.')), 5_000);

  socket.once('connect_error', (error) => {
    clearTimeout(timer);
    reject(error);
  });

  socket.once('sfu:ready', (ready: { session_id?: string }) => {
    if (ready.session_id !== sessionId) {
      clearTimeout(timer);
      reject(new Error('SFU ready event returned a different session.'));
      return;
    }

    socket.emit('transport:create', { direction: 'send' }, (result: {
      ok?: boolean;
      transport?: { id?: string; ice_candidates?: unknown[] };
    }) => {
      clearTimeout(timer);
      if (!result.ok || !result.transport?.id || !result.transport.ice_candidates?.length) {
        reject(new Error('SFU transport creation failed.'));
        return;
      }

      resolve();
    });
  });
});

socket.close();
console.log('SFU signaling smoke test passed.');
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
