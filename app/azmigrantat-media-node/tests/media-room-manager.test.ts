import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import { MediaRoomManager, MediaSignalingError } from '../src/media/media-room-manager';
import type { MediaSession } from '../src/media/media-session-manager';

class FakeResource extends EventEmitter {
  readonly observer = new EventEmitter();
  closed = false;

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.emit('close');
    this.observer.emit('close');
  }
}

class FakeProducer extends FakeResource {
  constructor(public readonly id: string, public readonly kind: 'audio' | 'video') {
    super();
  }
}

class FakeConsumer extends FakeResource {
  resumed = false;

  constructor(
    public readonly id: string,
    public readonly producerId: string,
    public readonly kind: 'audio' | 'video' = 'video',
  ) {
    super();
  }

  async resume(): Promise<void> {
    this.resumed = true;
  }
}

class FakeTransport extends FakeResource {
  private producerNumber = 0;
  private consumerNumber = 0;
  connected = false;
  lastConsumePaused: boolean | null = null;

  readonly iceParameters = {};
  readonly iceCandidates = [];
  readonly dtlsParameters = {};
  readonly sctpParameters = undefined;

  constructor(public readonly id: string) {
    super();
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async produce(options: { kind: 'audio' | 'video' }): Promise<FakeProducer> {
    const producer = new FakeProducer(`${this.id}-producer-${++this.producerNumber}`, options.kind);
    this.emit('producer', producer);
    return producer;
  }

  async consume(options: { producerId: string; paused: boolean }): Promise<FakeConsumer> {
    this.lastConsumePaused = options.paused;
    return new FakeConsumer(`${this.id}-consumer-${++this.consumerNumber}`, options.producerId);
  }
}

const streamer: MediaSession = {
  session_id: 'streamer-session',
  room_id: 'room-1',
  role: 'streamer',
  node_id: 'media-node-1',
  signaling_url: 'https://live.azmigrantat.com',
  signaling_endpoint: 'https://live.azmigrantat.com/v1/rooms/room-1',
  router_rtp_capabilities: {},
};

const viewer: MediaSession = { ...streamer, session_id: 'viewer-session', role: 'viewer' };
const otherRoomViewer: MediaSession = { ...viewer, session_id: 'other-room-session', room_id: 'room-2' };

function createManager() {
  let transportNumber = 0;
  let canConsume = true;
  const transports: FakeTransport[] = [];
  const mediaNode = {
    createWebRtcTransport: async () => {
      const transport = new FakeTransport(`transport-${++transportNumber}`);
      transports.push(transport);
      return transport;
    },
    canConsume: () => canConsume,
    onClose: () => () => undefined,
  };
  return {
    manager: new MediaRoomManager(mediaNode as never),
    transports,
    setCanConsume(value: boolean) {
      canConsume = value;
    },
  };
}

test('creates transports, enforces roles, and connects transports', async () => {
  const { manager } = createManager();
  const sendTransport = await manager.createTransport(streamer, 'send');
  assert.equal(sendTransport.id, 'transport-1');
  await manager.connectTransport(streamer, sendTransport.id, {} as never);
  assert.equal((sendTransport as FakeTransport).connected, true);

  await assert.rejects(
    () => manager.createTransport(viewer, 'send'),
    (error: unknown) => error instanceof MediaSignalingError && error.status === 403,
  );
  await assert.rejects(
    () => manager.connectTransport(streamer, 'missing', {} as never),
    (error: unknown) => error instanceof MediaSignalingError && error.status === 404,
  );
});

test('supports audio/video producers and viewer consume/resume flow', async () => {
  const { manager, transports } = createManager();
  const sendTransport = await manager.createTransport(streamer, 'send');
  const audio = await manager.createProducer(streamer, sendTransport.id, 'audio', {} as never);
  const video = await manager.createProducer(streamer, sendTransport.id, 'video', {} as never);
  assert.deepEqual(manager.listProducers(viewer).map((producer) => producer.kind), ['audio', 'video']);

  const recvTransport = await manager.createTransport(viewer, 'recv');
  const consumer = await manager.createConsumer(viewer, recvTransport.id, video.id, {} as never);
  assert.equal(transports[1].lastConsumePaused, true);
  await manager.resumeConsumer(viewer, consumer.id);
  assert.equal((consumer as FakeConsumer).resumed, true);

  await assert.rejects(
    () => manager.createProducer(viewer, recvTransport.id, 'video', {} as never),
    (error: unknown) => error instanceof MediaSignalingError && error.status === 403,
  );
  assert.equal(audio.kind, 'audio');
});

test('rejects incompatible consume and prevents cross-room access', async () => {
  const { manager } = createManager();
  const sendTransport = await manager.createTransport(streamer, 'send');
  const producer = await manager.createProducer(streamer, sendTransport.id, 'video', {} as never);
  const otherRoomTransport = await manager.createTransport(otherRoomViewer, 'recv');

  await assert.rejects(
    () => manager.createConsumer(otherRoomViewer, otherRoomTransport.id, producer.id, {} as never),
    (error: unknown) => error instanceof MediaSignalingError && error.status === 404,
  );

  const { manager: incompatibleManager, setCanConsume } = createManager();
  const send = await incompatibleManager.createTransport(streamer, 'send');
  const item = await incompatibleManager.createProducer(streamer, send.id, 'video', {} as never);
  const receive = await incompatibleManager.createTransport(viewer, 'recv');
  setCanConsume(false);
  await assert.rejects(
    () => incompatibleManager.createConsumer(viewer, receive.id, item.id, {} as never),
    (error: unknown) => error instanceof MediaSignalingError && error.status === 422,
  );
});

test('cleans consumers and producers when a producer or transport closes', async () => {
  const { manager } = createManager();
  const sendTransport = await manager.createTransport(streamer, 'send');
  const producer = await manager.createProducer(streamer, sendTransport.id, 'video', {} as never);
  const recvTransport = await manager.createTransport(viewer, 'recv');
  const consumer = await manager.createConsumer(viewer, recvTransport.id, producer.id, {} as never);

  producer.close();
  assert.equal(consumer.closed, true);
  assert.equal(manager.listProducers(viewer).length, 0);

  const secondProducer = await manager.createProducer(streamer, sendTransport.id, 'audio', {} as never);
  const secondConsumer = await manager.createConsumer(viewer, recvTransport.id, secondProducer.id, {} as never);
  recvTransport.close();
  assert.equal(secondConsumer.closed, true);
  sendTransport.close();
  assert.equal(manager.listProducers(viewer).length, 0);
});
