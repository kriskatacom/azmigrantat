import type { types } from 'mediasoup';
import type { Server, Socket } from 'socket.io';

import type { MediaNode } from './media-node';
import type { MediaSessionManager } from './media-session-manager';

type SessionState = {
  sessionId: string;
  roomId: string;
  role: 'streamer' | 'viewer';
  transports: Map<string, types.WebRtcTransport>;
  producers: Map<string, types.Producer>;
  consumers: Map<string, types.Consumer>;
};

type RoomState = { producers: Map<string, types.Producer> };

export class SfuSignaling {
  private readonly sessions = new Map<string, SessionState>();
  private readonly rooms = new Map<string, RoomState>();

  constructor(
    private readonly io: Server,
    private readonly mediaNode: MediaNode,
    private readonly sessionManager: MediaSessionManager,
  ) {}

  register(): void {
    this.io.on('connection', (socket) => void this.handleConnection(socket));
  }

  private async handleConnection(socket: Socket): Promise<void> {
    const value = socket.handshake.auth?.session_id;
    const session = typeof value === 'string' ? this.sessionManager.get(value) : null;

    if (!session) {
      socket.emit('sfu:error', { code: 'SESSION_INVALID', message: 'Невалидна media session.' });
      socket.disconnect(true);
      return;
    }

    const state: SessionState = {
      sessionId: session.session_id,
      roomId: session.room_id,
      role: session.role,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };

    this.sessions.set(state.sessionId, state);
    await socket.join(this.roomName(state.roomId));
    socket.emit('sfu:ready', {
      session_id: session.session_id,
      room_id: session.room_id,
      role: session.role,
      router_rtp_capabilities: session.router_rtp_capabilities,
      producer_ids: [...(this.rooms.get(state.roomId)?.producers.keys() ?? [])],
    });

    socket.on('transport:create', (payload, callback) => {
      void this.createTransport(state, payload, callback);
    });
    socket.on('transport:connect', (payload, callback) => {
      void this.connectTransport(state, payload, callback);
    });
    socket.on('producer:create', (payload, callback) => {
      void this.createProducer(state, socket, payload, callback);
    });
    socket.on('consumer:create', (payload, callback) => {
      void this.createConsumer(state, payload, callback);
    });
    socket.on('consumer:resume', (payload, callback) => {
      void this.resumeConsumer(state, payload, callback);
    });
    socket.on('disconnect', () => this.cleanup(state));
  }

  private async createTransport(state: SessionState, payload: unknown, callback: (value: unknown) => void): Promise<void> {
    const direction = this.field(payload, 'direction');

    if (direction !== 'send' && direction !== 'recv') {
      callback({ ok: false, code: 'DIRECTION_INVALID', message: 'Невалидна transport посока.' });
      return;
    }

    try {
      const transport = await this.mediaNode.createWebRtcTransport();
      state.transports.set(transport.id, transport);
      callback({
        ok: true,
        transport: {
          id: transport.id,
          direction,
          ice_parameters: transport.iceParameters,
          ice_candidates: transport.iceCandidates,
          dtls_parameters: transport.dtlsParameters,
          sctp_parameters: transport.sctpParameters,
        },
      });
    } catch (error) {
      callback({ ok: false, code: 'TRANSPORT_CREATE_FAILED', message: this.message(error) });
    }
  }

  private async connectTransport(state: SessionState, payload: unknown, callback: (value: unknown) => void): Promise<void> {
    const transportId = this.field(payload, 'transport_id');
    const dtlsParameters = this.objectField(payload, 'dtls_parameters');
    const transport = typeof transportId === 'string' ? state.transports.get(transportId) : undefined;

    if (!transport || !dtlsParameters) {
      callback({ ok: false, code: 'TRANSPORT_INVALID', message: 'Невалиден transport или DTLS payload.' });
      return;
    }

    try {
      await transport.connect({ dtlsParameters: dtlsParameters as types.DtlsParameters });
      callback({ ok: true });
    } catch (error) {
      callback({ ok: false, code: 'TRANSPORT_CONNECT_FAILED', message: this.message(error) });
    }
  }

  private async createProducer(state: SessionState, socket: Socket, payload: unknown, callback: (value: unknown) => void): Promise<void> {
    const transportId = this.field(payload, 'transport_id');
    const kind = this.field(payload, 'kind');
    const rtpParameters = this.objectField(payload, 'rtp_parameters');
    const transport = typeof transportId === 'string' ? state.transports.get(transportId) : undefined;

    if (state.role !== 'streamer' || (kind !== 'audio' && kind !== 'video')) {
      callback({ ok: false, code: 'PRODUCER_DENIED', message: 'Само streamer може да създава producer.' });
      return;
    }

    if (!transport || !rtpParameters) {
      callback({ ok: false, code: 'PRODUCER_INVALID', message: 'Невалиден producer payload.' });
      return;
    }

    try {
      const producer = await transport.produce({ kind, rtpParameters: rtpParameters as types.RtpParameters });
      state.producers.set(producer.id, producer);
      const room = this.rooms.get(state.roomId) ?? { producers: new Map() };
      room.producers.set(producer.id, producer);
      this.rooms.set(state.roomId, room);
      producer.on('transportclose', () => this.removeProducer(state, producer.id));
      socket.to(this.roomName(state.roomId)).emit('sfu:producer-available', {
        producer_id: producer.id,
        kind: producer.kind,
      });
      callback({ ok: true, producer_id: producer.id });
    } catch (error) {
      callback({ ok: false, code: 'PRODUCER_CREATE_FAILED', message: this.message(error) });
    }
  }

  private async createConsumer(state: SessionState, payload: unknown, callback: (value: unknown) => void): Promise<void> {
    const transportId = this.field(payload, 'transport_id');
    const producerId = this.field(payload, 'producer_id');
    const rtpCapabilities = this.objectField(payload, 'rtp_capabilities');
    const transport = typeof transportId === 'string' ? state.transports.get(transportId) : undefined;
    const producer = typeof producerId === 'string' ? this.rooms.get(state.roomId)?.producers.get(producerId) : undefined;

    if (!transport || !producer || !rtpCapabilities) {
      callback({ ok: false, code: 'CONSUMER_INVALID', message: 'Невалиден consumer payload.' });
      return;
    }

    if (!this.mediaNode.canConsume(producer.id, rtpCapabilities as types.RtpCapabilities)) {
      callback({ ok: false, code: 'CANNOT_CONSUME', message: 'Router не може да consume-не този producer.' });
      return;
    }

    try {
      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: rtpCapabilities as types.RtpCapabilities,
        paused: true,
      });
      state.consumers.set(consumer.id, consumer);
      callback({
        ok: true,
        consumer: {
          id: consumer.id,
          producer_id: producer.id,
          kind: consumer.kind,
          rtp_parameters: consumer.rtpParameters,
          type: consumer.type,
        },
      });
    } catch (error) {
      callback({ ok: false, code: 'CONSUMER_CREATE_FAILED', message: this.message(error) });
    }
  }

  private async resumeConsumer(state: SessionState, payload: unknown, callback: (value: unknown) => void): Promise<void> {
    const consumerId = this.field(payload, 'consumer_id');
    const consumer = typeof consumerId === 'string' ? state.consumers.get(consumerId) : undefined;

    if (!consumer) {
      callback({ ok: false, code: 'CONSUMER_INVALID', message: 'Consumer не е намерен.' });
      return;
    }

    await consumer.resume();
    callback({ ok: true });
  }

  private cleanup(state: SessionState): void {
    for (const consumer of state.consumers.values()) consumer.close();
    for (const producer of [...state.producers.values()]) this.removeProducer(state, producer.id);
    for (const transport of state.transports.values()) transport.close();
    this.sessions.delete(state.sessionId);
    this.sessionManager.remove(state.sessionId);
  }

  private removeProducer(state: SessionState, producerId: string): void {
    state.producers.delete(producerId);
    const room = this.rooms.get(state.roomId);
    room?.producers.delete(producerId);
    if (room && room.producers.size === 0) this.rooms.delete(state.roomId);
  }

  private roomName(roomId: string): string {
    return `sfu:${roomId}`;
  }

  private field(payload: unknown, key: string): unknown {
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>)[key] : undefined;
  }

  private objectField(payload: unknown, key: string): Record<string, unknown> | null {
    const value = this.field(payload, key);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'SFU signaling error.';
  }
}
