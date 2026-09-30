import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { io } from 'socket.io-client';
import WebSocket from 'ws';

const realtimeUrl = required('LOAD_REALTIME_URL').replace(/\/+$/, '');
const signalingUrl = required('LOAD_SIGNALING_URL').replace(/\/+$/, '');
const internalSecret = required('LOAD_INTERNAL_SECRET');
const viewerCount = Number(process.env.LOAD_VIEWERS ?? '10');
const holdSeconds = Number(process.env.LOAD_HOLD_SECONDS ?? '20');
const browserCount = Number(process.env.LOAD_PROCESSES ?? '1');
const httpPort = Number(process.env.LOAD_HTTP_PORT ?? '8787');
const liveId = 980_000 + (Date.now() % 19_999);
const roomId = `loadtest-rtp-${liveId}`;
const mediasoupBundle = pathToFileURL(process.env.LOAD_MEDIASOUP_BUNDLE ?? '/tmp/azmigrantat-mediasoup-client.bundle.js');

type Session = { session_id: string; router_rtp_capabilities: unknown };
type CdpMessage = { id?: number; result?: { result?: { value?: unknown }; exceptionDetails?: { text?: string; exception?: { description?: string } } }; error?: { message?: string } };

if (!Number.isInteger(viewerCount) || viewerCount < 1 || viewerCount > 500) throw new Error('LOAD_VIEWERS must be 1..500.');
if (!Number.isInteger(browserCount) || browserCount < 1 || browserCount > 8) throw new Error('LOAD_PROCESSES must be 1..8.');
if (!Number.isInteger(httpPort) || httpPort < 1024 || httpPort > 65535) throw new Error('LOAD_HTTP_PORT must be 1024..65535.');

async function main(): Promise<void> {
  const sessions: Session[] = [];
  let allocated = false;
  let server: ReturnType<typeof createServer> | undefined;
  try {
    await request('/internal/media/allocate', { live_id: liveId, media_room_id: roomId });
    allocated = true;
    sessions.push((await request<{ session: Session }>('/internal/media/session', { live_id: liveId, role: 'streamer' })).session);
    for (let index = 0; index < viewerCount; index++) {
      sessions.push((await request<{ session: Session }>('/internal/media/session', { live_id: liveId, role: 'viewer' })).session);
    }
    server = createServer(async (request, response) => {
      const asset = request.url === '/sfu-browser-load.html'
        ? new URL('./sfu-browser-load.html', import.meta.url)
        : request.url === '/mediasoup-client.bundle.js'
        ? mediasoupBundle
          : request.url?.startsWith('/socket.io-client/')
            ? new URL(`../node_modules/socket.io-client/${request.url.slice('/socket.io-client/'.length)}`, import.meta.url)
            : null;
      if (!asset) {
        response.writeHead(404);
        response.end();
        return;
      }
      response.writeHead(200, { 'content-type': asset.pathname.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' });
      response.end(await readFile(asset));
    });
    await new Promise<void>((resolve) => server?.listen(httpPort, '127.0.0.1', resolve));
    const viewers = sessions.slice(1);
    const chunks = Array.from({ length: browserCount }, () => [] as Session[]);
    viewers.forEach((session, index) => chunks[index % browserCount].push(session));
    const browserRuns: Promise<unknown>[] = [];
    for (let index = 0; index < browserCount; index++) {
      browserRuns.push(runBrowser({
        index,
        signalingUrl,
        streamer: index === 0 ? sessions[0] : null,
        viewers: chunks[index],
        holdMs: holdSeconds * 1000,
      }));
    }
    const results = await Promise.allSettled(browserRuns);
    console.log('[rtp-load] browser results:', JSON.stringify(results.map((result) => result.status === 'rejected'
      ? { status: result.status, reason: result.reason instanceof Error ? result.reason.message : String(result.reason) }
      : result)));
  } finally {
    if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
    if (allocated) await request('/internal/media/release', { live_id: liveId }).catch(() => undefined);
  }
}

async function runBrowser({ index, signalingUrl, streamer, viewers, holdMs }: {
  index: number;
  signalingUrl: string;
  streamer: Session | null;
  viewers: Session[];
  holdMs: number;
}): Promise<unknown> {
  const port = 9223 + index;
  const browser = spawn('/usr/bin/google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream', `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/azmigrantat-load-chrome-${index}-${Date.now()}`,
    `http://127.0.0.1:${httpPort}/sfu-browser-load.html`,
  ], { stdio: 'ignore' });
  try {
    await wait(3000);
    const version = await fetch(`http://127.0.0.1:${port}/json/version`).then((response) => response.json()) as { webSocketDebuggerUrl: string };
    const socket = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let commandId = 0;
    const command = (method: string, params: object = {}, targetSessionId?: string) => new Promise<CdpMessage>((resolve, reject) => {
      const id = ++commandId;
      const onMessage = (data: WebSocket.RawData) => {
        const message = JSON.parse(data.toString()) as CdpMessage & { id?: number };
        if (message.id !== id) return;
        socket.off('message', onMessage);
        message.error ? reject(new Error(message.error.message)) : resolve(message);
      };
      socket.on('message', onMessage);
      socket.send(JSON.stringify({ id, method, params, ...(targetSessionId ? { sessionId: targetSessionId } : {}) }));
    });
    const target = await command('Target.createTarget', { url: `http://127.0.0.1:${httpPort}/sfu-browser-load.html` });
    const targetId = (target.result as { targetId: string }).targetId;
    const attached = await command('Target.attachToTarget', { targetId, flatten: true });
    const sessionId = (attached.result as { sessionId: string }).sessionId;
    await command('Page.enable', {}, sessionId);
    await wait(3000);
    const payload = { signalingUrl, streamer, viewers, holdMs };
    const expression = `(async()=>JSON.stringify(await (window.runSfuLoad ? window.runSfuLoad(${JSON.stringify(payload)}) : Promise.reject(new Error(window.__loadError || 'browser harness did not load')))))()`;
    const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    const exception = result.result?.exceptionDetails;
    if (exception) {
      throw new Error(exception.exception?.description || exception.text || 'browser runtime exception');
    }
    const value = result.result?.result?.value;
    if (typeof value === 'string') return { index, result: JSON.parse(value) };
    return { index, result: value ?? result.result };
  } finally {
    browser.kill('SIGTERM');
  }
}

async function request<T = unknown>(path: string, body: object): Promise<T> {
  const response = await fetch(`${realtimeUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json', 'X-Internal-Secret': internalSecret }, body: JSON.stringify(body) });
  const payload = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${payload.message ?? ''}`);
  return payload;
}
function required(name: string): string { const value = process.env[name]?.trim(); if (!value) throw new Error(`Missing ${name}.`); return value; }
function wait(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
void main().catch((error: unknown) => { console.error('[rtp-load] failed:', error instanceof Error ? error.message : error); process.exitCode = 1; });
